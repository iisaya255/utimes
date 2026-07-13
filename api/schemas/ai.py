"""
AI 服务相关的 Pydantic 数据模型
"""
from pydantic import BaseModel, Field


class PlannedItemExtra(BaseModel):
    """AI 规划项的扩展信息"""
    happy: str = ""
    meaningful: str = ""
    better: str = ""


class PlannedItem(BaseModel):
    """AI 生成的规划任务项"""
    project: str = ""
    time: str = ""
    happy: int = 3
    meaningful: int = 3
    extra: PlannedItemExtra = Field(default_factory=PlannedItemExtra)
