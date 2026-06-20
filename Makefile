.PHONY: help dev test migrate shell clean

help:
	@echo "SkillSwap Network — Available commands:"
	@echo "  make dev      - Start with Docker Compose"
	@echo "  make test     - Run backend tests"
	@echo "  make migrate  - Run Alembic migrations"
	@echo "  make clean    - Stop and remove containers"

dev:
	docker-compose up --build

test:
	cd backend && python -m pytest -v

migrate:
	cd backend && alembic upgrade head

clean:
	docker-compose down -v --remove-orphans
