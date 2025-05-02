from typing import Generic, Optional, TypeVar

import strawberry

GenericType = TypeVar('GenericType')


@strawberry.type
class Connection(Generic[GenericType]):
	page_info: 'PageInfo' = strawberry.field(description='Information to aid in pagination.')

	edges: list['Edge[GenericType]'] = strawberry.field(
		description='A list of edges in this connection.'
	)


@strawberry.type
class PageInfo:
	has_next_page: bool = strawberry.field(
		description='When paginating forwards, are there more items?'
	)

	has_previous_page: bool = strawberry.field(
		description='When paginating backwards, are there more items?'
	)

	start_cursor: Optional[str] = strawberry.field(
		description='When paginating backwards, the cursor to continue.'
	)

	end_cursor: Optional[str] = strawberry.field(
		description='When paginating forwards, the cursor to continue.'
	)


@strawberry.type
class Edge(Generic[GenericType]):
	node: GenericType = strawberry.field(description='The item at the end of the edge.')

	cursor: str = strawberry.field(description='A cursor for use in pagination.')
