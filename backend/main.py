import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from app.agents.orchestrator import builder, get_state_checkpointer

app = FastAPI(
    title="NeuroNex API Gateway",
    version="2.0.0",
    description="Cognitive-Engineered Multi-Agent Platform."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    query: str
    thread_id: str

@app.post("/api/v1/research")
async def execute_research(payload: ResearchRequest):
    """
    Accepts incoming queries and processes them through the compiled state graph.
    Uses the Postgres checkpointer to maintain thread history.[12, 18]
    """
    try:
        checkpointer = await get_state_checkpointer()
        compiled_graph = builder.compile(checkpointer=checkpointer)
        
        # Configure thread identity context
        config = {"configurable": {"thread_id": payload.thread_id}}
        
        result = await compiled_graph.ainvoke(
            {"query": payload.query}, 
            config=config
        )
        
        return {
            "thread_id": payload.thread_id,
            "status": "success",
            "score": result.get("calibrated_score"),
            "data": result.get("final_report")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)