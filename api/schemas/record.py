"""
Record 相关的 Pydantic 数据模型
"""
from pydantic import BaseModel, Field


class DataItemExtra(BaseModel):
    """数据项的扩展信息"""
    happy: str = ""
    meaningful: str = ""
    better: str = ""


class DataItem(BaseModel):
    """单条活动/任务记录"""
    id: int | None = None
    project: str = ""
    time: str = ""
    happy: int | float = 0
    meaningful: int | float = 0
    extra: DataItemExtra = Field(default_factory=DataItemExtra)


class RecordContent(BaseModel):
    """record 表 content 字段的 JSON 结构"""
    todo: str = ""
    topic: list = Field(default_factory=list)
    dataList: list[DataItem] = Field(default_factory=list)


class SaveRequest(BaseModel):
    """保存数据的请求体"""
    date: str
    content: RecordContent | dict | str | None = None
    note: str = ""
    dataList: list[DataItem] | list[dict] | None = None


class SearchQuery(BaseModel):
    """搜索请求"""
    query: str = ""


class ConfigData(BaseModel):
    """配置数据响应"""
    extra1: str = ""
    extra2: str = ""
    extra3: str = ""
    extra: str = ""


class ConfigSaveRequest(BaseModel):
    """保存配置的请求体"""
    extra1: str = Field(default="", max_length=10000)
    extra2: str = Field(default="", max_length=10000)
    extra3: str = Field(default="", max_length=10000)
    extra: str = ""


class CalendarEntry(BaseModel):
    """日历中的单条记录"""
    type: str = "success"
    content: str = ""


class CalendarStats(BaseModel):
    """日历统计数据"""
    total: int = 0
    fit: int = 0
    code: int = 0


class CalendarResponse(BaseModel):
    """日历接口响应"""
    calendar: dict[str, list[CalendarEntry]] = Field(default_factory=dict)
    stats: CalendarStats = Field(default_factory=CalendarStats)


class DetailResponse(BaseModel):
    """详情接口响应"""
    date: str = ""
    time: str = ""
    note: str = ""
    items: list[DataItem] = Field(default_factory=list)


class EditResponse(BaseModel):
    """编辑接口响应"""
    time: str = ""
    extra2Text: str = ""
    extra3Links: str = ""
    extraInfo: str = ""
    note: str = ""
    items: list[DataItem] = Field(default_factory=list)


class SearchResultItem(BaseModel):
    """搜索结果单条"""
    date: str = ""
    url: str = ""
    content: str = ""
