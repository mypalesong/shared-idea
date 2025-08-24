# main.py
from fastapi import FastAPI, Query
import asyncio
import uvicorn

app = FastAPI()


@app.get("/status")
async def status(delay: int = Query(0, ge=0, le=30)):
    print(f"👉 Received delay param: {delay}")  # 콘솔에 출력
    if delay > 0:
        await asyncio.sleep(delay)
    return {"ok": True, "msg": f"FastAPI responded after {delay} sec"}


if __name__ == "__main__":
    # uvicorn으로 바로 실행 (포트 30916)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8100,
        reload=True,  # 개발 중이면 True로
        workers=3,
        log_level="info",
    )