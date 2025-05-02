import strawberry


@strawberry.type
class GenericQuery:
	@strawberry.field
	def hello(self) -> str:
		return 'Hello World'
