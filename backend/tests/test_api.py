import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    engine = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.core.database import Base, get_db
    from app.main import app

    async def override_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_db

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_health(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_register(client):
    res = await client.post("/api/auth/register", json={
        "email": "ishwar@example.com",
        "username": "ishwar_dev",
        "password": "securepass123",
        "full_name": "Ishwar Lahire",
        "location": "Nashik, Maharashtra",
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "ishwar@example.com"
    assert data["user"]["username"] == "ishwar_dev"


@pytest.mark.anyio
async def test_register_duplicate(client):
    payload = {"email": "dup@example.com", "username": "dupuser", "password": "pass123"}
    await client.post("/api/auth/register", json=payload)
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 400


@pytest.mark.anyio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "email": "login@example.com", "username": "loginuser", "password": "mypassword"
    })
    res = await client.post("/api/auth/login", data={
        "username": "login@example.com", "password": "mypassword"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.anyio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "wrong@example.com", "username": "wronguser", "password": "rightpass"
    })
    res = await client.post("/api/auth/login", data={
        "username": "wrong@example.com", "password": "wrongpass"
    })
    assert res.status_code == 401


@pytest.mark.anyio
async def test_get_me(client):
    reg = await client.post("/api/auth/register", json={
        "email": "me@example.com", "username": "meuser", "password": "mepass123"
    })
    token = reg.json()["access_token"]
    res = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


@pytest.mark.anyio
async def test_add_skill(client):
    reg = await client.post("/api/auth/register", json={
        "email": "skill@example.com", "username": "skilluser", "password": "skillpass"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post("/api/users/me/skills/offer", json={"name": "Python", "level": "expert"}, headers=headers)
    assert res.status_code == 201
    assert res.json()["name"] == "Python"

    res = await client.post("/api/users/me/skills/want", json={"name": "React", "level": "beginner"}, headers=headers)
    assert res.status_code == 201


@pytest.mark.anyio
async def test_swap_request(client):
    # Register two users
    r1 = await client.post("/api/auth/register", json={
        "email": "user1@example.com", "username": "user_one", "password": "pass1234"
    })
    r2 = await client.post("/api/auth/register", json={
        "email": "user2@example.com", "username": "user_two", "password": "pass1234"
    })
    token1 = r1.json()["access_token"]
    user2_id = r2.json()["user"]["id"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Send swap
    res = await client.post("/api/swaps/", json={
        "receiver_id": user2_id, "message": "Let us swap skills!"
    }, headers=headers1)
    assert res.status_code == 201
    assert res.json()["status"] == "pending"
