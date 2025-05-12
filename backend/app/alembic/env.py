from logging.config import fileConfig
import re
from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool
from sqlalchemy_utils import database_exists, create_database
from app.core.config import settings
from alembic import context
from sqlmodel import SQLModel
import app.models # noqa: F401

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
	fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = SQLModel.metadata

# --- Debugging: Print metadata contents ---
print("--- Inspecting Alembic Metadata ---")
print(f"Metadata object: {target_metadata}")
print(f"Registered tables: {target_metadata.tables}") # Shows tables known to metadata
print("---------------------------------")

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_url():
	return str(settings.SQLALCHEMY_DATABASE_URI)


def check_and_create_database():
	"""Check if database exists and create it if it doesn't."""
	url = get_url()
	engine = create_engine(url)

	if not database_exists(engine.url):
		print(f"Database does not exist. Creating database at {engine.url}")
		create_database(engine.url)
		print("Database created successfully!")
	else:
		print(f"Database already exists at {engine.url}")

	engine.dispose()


def run_migrations_offline() -> None:
	"""Run migrations in 'offline' mode.

	This configures the context with just a URL
	and not an Engine, though an Engine is acceptable
	here as well.  By skipping the Engine creation
	we don't even need a DBAPI to be available.

	Calls to context.execute() here emit the given string to the
	script output.

	"""
	url = get_url()
	context.configure(
		url=url,
		target_metadata=target_metadata,
		literal_binds=True,
		dialect_opts={'paramstyle': 'named'},
	)

	with context.begin_transaction():
		context.run_migrations()


def run_migrations_online() -> None:
	"""Run migrations in 'online' mode.

	In this scenario we need to create an Engine
	and associate a connection with the context.

	"""
	# Check and create database if it doesn't exist
	check_and_create_database()

	configuration = config.get_section(config.config_ini_section)
	configuration['sqlalchemy.url'] = get_url()
	connectable = engine_from_config(
		configuration,
		prefix='sqlalchemy.',
		poolclass=pool.NullPool,
	)

	with connectable.connect() as connection:
		context.configure(connection=connection, target_metadata=target_metadata)

		with context.begin_transaction():
			context.run_migrations()


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()
