"""
Record 数据转换工具函数
"""
from api.schemas.record import DataItem, DataItemExtra


def convert_items_to_response(items_list) -> list[dict]:
    """将数据库中的 items 列表转为前端需要的格式（带递增 id）"""
    result = []
    for idx, item in enumerate(items_list):
        extra_raw = item.get('extra', {})
        data_item = DataItem(
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
        )
        result.append(data_item.model_dump())
    return result


def validate_date_format(date_str: str):
    """验证日期格式 YYYYMMDD"""
    if not date_str or len(date_str) != 8:
        return False
    try:
        from datetime import datetime
        datetime.strptime(date_str, "%Y%m%d")
        return True
    except ValueError:
        return False


def build_record_response(record_row, settings_row=None, include_settings=False):
    """
    构建记录数据的响应格式
    record_row: 数据库返回的 dict（含 date, note, items）
    settings_row: user_settings 表的 dict（可选）
    """
    if not record_row:
        return None

    items_data = record_row.get('items', [])
    if isinstance(items_data, str):
        import json
        items_data = json.loads(items_data)

    items = convert_items_to_response(items_data)

    result = {
        'date': record_row.get('date', ''),
        'time': record_row.get('date', ''),
        'note': record_row.get('note', ''),
        'items': items,
    }

    if include_settings and settings_row:
        result['extra2Text'] = settings_row.get('daily_tips', '')
        result['extra3Links'] = settings_row.get('quick_links', '')
        result['extraInfo'] = settings_row.get('daily_tips', '')

    return result
