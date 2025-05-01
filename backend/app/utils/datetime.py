from datetime import datetime, timezone


def datetime_utcnow():
	return datetime.now(timezone.utc).replace(tzinfo=None)
