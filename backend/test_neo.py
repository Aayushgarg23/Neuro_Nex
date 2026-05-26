import asyncio, os
from dotenv import load_dotenv
from neo4j import AsyncGraphDatabase
import time

load_dotenv()

async def test():
    uri = os.getenv('NEO4J_URI')
    user = os.getenv('NEO4J_USERNAME')
    password = os.getenv('NEO4J_PASSWORD')
    print(f"Connecting to {uri}")
    driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
    
    try:
        async with driver.session() as session:
            print("Session opened, running Cypher...")
            query = (
                "MERGE (a:Entity {name: $a}) "
                "MERGE (b:Entity {name: $b}) "
                "CREATE (a)-[r:TEST_REL]->(b) "
                "SET r += $props "
                "RETURN id(r) as eid"
            )
            props = {"confidence": 0.99, "provenance": "abc", "timestamp": time.time()}
            result = await session.run(query, a="NodeA", b="NodeB", props=props)
            record = await result.single()
            print(f"Success! Created edge ID: {record['eid']}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await driver.close()

asyncio.run(test())
