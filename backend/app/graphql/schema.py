import strawberry

from .resolvers.generic_resolver import GenericQuery


@strawberry.type
class CombinedQuery(GenericQuery):  # Inherit from all query types
	pass


schema = strawberry.Schema(query=CombinedQuery)
