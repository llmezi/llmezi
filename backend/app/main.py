import sentry_sdk
from fastapi import FastAPI

from app.core.config import settings

if settings.SENTRY_DSN and settings.ENVIRONMENT != 'local':
	sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(title='llmezi api', docs_url=None, redoc_url=None)


@app.get('/')
async def read_root():
	return {'message': 'Welcome to the llmezi API!'}
