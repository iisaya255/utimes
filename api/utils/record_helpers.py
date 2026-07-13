"""
Record 数据转换工具函数
"""
import json

from api.schemas.record import DataItem, DataItemExtra


def convert_data_list_to_items(data_list) -> list[DataItem]:
    """将后端数据格式转换为前端需要的格式"""
    items = []
    for idx, item in enumerate(data_list):
        extra_raw = item.get('extra', {})
        items.append(DataItem(
            id=idx + 1,
            project=item.get('project', ''),
            time=item.get('time', ''),
            happy=item.get('happy', 0),
            meaningful=item.get('meaningful', 0),
            extra=DataItemExtra(
                happy=extra_raw.get('happy', ''),
                meaningful=extra_raw.get('meaningful', ''),
                better=extra_raw.get('better', ''),
            ),
        ))
    return items


def validate_date_format(date_str: str):
    """验证日期格式 YYYYMMDD，检查日历有效性"""
    if not date_str or len(date_str) != 8:
        return False
    try:
        from datetime import datetime
        datetime.strptime(date_str, "%Y%m%d")
        return True
    except ValueError:
        return False


def parse_record_content(content_str):
    """安全地解析 record 的 content JSON 字符串"""
    try:
        return json.loads(content_str)
    except (json.JSONDecodeError, TypeError):
        return None


def build_record_response(record_row, extra_row=None, include_extra_info=True):
    """
    构建记录数据的响应格式
    record_row: 数据库返回的 dict
    extra_row: extra 表的 dict（可选）
    返回 dict（pydantic model 序列化后）
    """
    if not record_row:
        return None

    try:
        data = parse_record_content(record_row.get('content', ''))
        if data is None:
            return None

        items = convert_data_list_to_items(data.get('dataList', []))

        result = {
            'date': record_row.get('date', ''),
            'time': record_row.get('date', ''),
            'note': data.get('todo', ''),
            'items': [item.model_dump() for item in items],
        }

        if include_extra_info and extra_row:
            result['extra2Text'] = extra_row.get('extra2', '')
            result['extra3Links'] = extra_row.get('extra3', '')
            result['extraInfo'] = extra_row.get('extra2', '')

        return result
    except Exception:
        return None
