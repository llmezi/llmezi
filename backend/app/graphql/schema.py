import strawberry

from app.graphql.resolvers.auth_resolver import AuthMutation
from app.graphql.resolvers.generic_resolver import GenericQuery
from app.graphql.resolvers.smtp_resolver import SMTPMutation, SMTPQuery
from app.graphql.resolvers.user_resolver import UserMutation, UserQuery
from app.graphql.utils import ErrorExtension


@strawberry.type
class Query(GenericQuery, UserQuery, SMTPQuery):
	"""Root Query type that combines all query types."""

	pass


@strawberry.type
class Mutation:
	"""Root Mutation type that combines all mutation types."""

	auth: AuthMutation = strawberry.field(resolver=lambda: AuthMutation())
	user: UserMutation = strawberry.field(resolver=lambda: UserMutation())
	smtp: SMTPMutation = strawberry.field(resolver=lambda: SMTPMutation())


schema = strawberry.Schema(
	query=Query,
	mutation=Mutation,
	extensions=[ErrorExtension],
)
