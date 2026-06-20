import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import auth, users, swaps, messages, admin
from app.core.database import engine, Base


# Logging
logging.basicConfig(
    level=logging.INFO if settings.is_production else logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Peer-to-peer skill exchange — Teach what you know, Learn what you want.",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Routes
app.include_router(auth.router,     prefix="/api")
app.include_router(users.router,    prefix="/api")
app.include_router(swaps.router,    prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(admin.router,    prefix="/api")



@app.get("/", tags=["Health"])
async def root():
    return {"project": settings.PROJECT_NAME, "version": settings.VERSION, "status": "running"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "version": settings.VERSION, "env": settings.ENVIRONMENT}


