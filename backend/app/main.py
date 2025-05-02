import sentry_sdk
from fastapi import FastAPI, Request
from strawberry.fastapi import GraphQLRouter

from app.core.config import settings
from app.core.database import SessionDep
from app.graphql.context import get_context
from app.graphql.schema import schema

if settings.SENTRY_DSN and settings.ENVIRONMENT != 'local':
	sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


# Create a context getter function that uses FastAPI's dependency injection
async def get_graphql_context(request: Request, session: SessionDep):
	return await get_context(request=request, session=session)


graphql_app = GraphQLRouter(
	schema=schema,
	graphql_ide=settings.ENVIRONMENT == 'local',
	allow_queries_via_get=False,
	context_getter=get_graphql_context,
)

app = FastAPI(title='llmezi api', docs_url=None, redoc_url=None)
app.include_router(graphql_app, prefix='/graphql')


@app.get('/')
async def read_root():
	return {'message': 'Welcome to the llmezi API!'}
