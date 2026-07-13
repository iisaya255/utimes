"""
AI 服务 - 周总结 & 今日规划
"""
import json
import logging
import os
import re
from datetime import datetime, timedelta

from api.models.record import Record, Extra
from api.schemas.ai import PlannedItem, PlannedItemExtra
from api.utils.record_helpers import parse_record_content


def _safe_int(val, default=3):
    """安全的整数转换"""
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def get_extra_config(user_id: str):
    """获取用户配置的 extra1 内容（用于 AI 上下文）"""
    extra_data = Extra.one(user_id=user_id)
    return extra_data.get("extra1", "") if extra_data else ""


def _get_week_data(user_id: str):
    """获取最近 7 天的数据"""
    today = datetime.now()
    week_data = []
    for i in range(7):
        date_obj = today - timedelta(days=i)
        date_str = date_obj.strftime('%Y%m%d')
        record = Record.one(date=date_str, user_id=user_id)
        if record:
            data = parse_record_content(record.get("content", ""))
            if data:
                week_data.append({
                    'date': date_str,
                    'note': data.get('todo', ''),
                    'items': data.get('dataList', [])
                })
    return week_data


def _build_week_summary_text(week_data):
    """构建周数据摘要文本"""
    week_summary = []
    for day_data in week_data:
        date_str = day_data['date']
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        summary = f"日期: {formatted_date}\n"
        if day_data.get('note'):
            summary += f"备注: {day_data['note']}\n"
        if day_data.get('items'):
            summary += "活动:\n"
            for item in day_data['items']:
                project = item.get('project', '')
                time_val = item.get('time', '')
                if project:
                    summary += f"  - {project}"
                    if time_val:
                        summary += f" ({time_val})"
                    summary += "\n"
        week_summary.append(summary)
    return "\n\n".join(week_summary)


def _build_plan_context_text(week_data):
    """构建规划上下文文本"""
    context = []
    for day_data in week_data:
        date_str = day_data['date']
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        summary = f"日期: {formatted_date}\n"
        if day_data.get('note'):
            summary += f"备注(一些临时记事/资料/感想等): {day_data['note']}\n"
        if day_data.get('items'):
            summary += "活动:\n"
            for item in day_data['items']:
                project = item.get('project', '')
                time_val = item.get('time', '')
                if project:
                    summary += f"  - {project}"
                    if time_val:
                        summary += f" ({time_val})"
                    summary += "\n"
                    summary += f"要做的事情({item.get('extra', {}).get('happy', '')})\n"
                    summary += f"完成情况({item.get('extra', {}).get('meaningful', '')})\n"
                    summary += f"简短总结({item.get('extra', {}).get('better', '')})\n"
        context.append(summary)
    return "\n\n".join(context)


def summarize_week(user_id: str):
    """总结最近一周"""
    from openai import OpenAI

    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        raise ValueError("DASHSCOPE_API_KEY 环境变量未设置")

    plan_ctx = get_extra_config(user_id)
    week_data = _get_week_data(user_id)
    week_text = _build_week_summary_text(week_data)

    client = OpenAI(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key=api_key,
        timeout=30.0,
    )

    prompt = f"""请总结我最近一周（7天）的主要活动和经历。以下是我每天记录的内容：

{week_text}

请用简洁的中文总结：
1. 这周主要做了哪些事情
2. 有哪些重要的进展或成果
3. 有什么值得注意的模式或趋势

我的一些个人情况参考: {plan_ctx}。

总结要简洁明了，控制在200字以内。"""

    response = client.chat.completions.create(
        model="qwen3-max",
        messages=[
            {"role": "system", "content": "你是一个帮助用户总结和分析日常记录的助手。"},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2048,
        temperature=0.7,
    )

    return response.choices[0].message.content


def plan_today(user_id: str):
    """规划今天要做的事情"""
    from openai import OpenAI

    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        raise ValueError("DASHSCOPE_API_KEY 环境变量未设置")

    plan_ctx = get_extra_config(user_id)
    week_data = _get_week_data(user_id)
    context_text = _build_plan_context_text(week_data)

    client = OpenAI(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key=api_key,
        timeout=30.0,
    )

    prompt = f"""基于我最近一周的活动记录，请帮我规划今天要做的事情。

规划原则参考: {plan_ctx}。

最近一周的活动记录：
{context_text}

请根据我的活动模式和习惯，为我规划今天要做的事情。要求：
1. 生成2-5个具体的任务或活动
2. 每个任务要简洁明确
3. 考虑我之前的活动模式，保持连续性
4. 考虑整体规划原则，以及之前的备注记录等
5. 格式为JSON数组，每个元素包含：
   - project: 项目/任务名称
   - extra: {{
     "happy": "总结这个项目最近还没完成的事情",
     "meaningful": "给出一些执行建议"
   }}

只返回JSON数组，不要其他文字说明。"""

    response = client.chat.completions.create(
        model="qwen3-max",
        messages=[
            {"role": "system", "content": "你是一个帮助用户规划日常任务的助手。你总是返回有效的JSON格式数据。"},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2048,
        temperature=0.7,
    )

    message_content = response.choices[0].message.content
    if not message_content:
        raise ValueError("AI 返回内容为空")

    content = message_content.strip()

    # 尝试解析 JSON（可能包含 markdown 代码块）
    json_match = re.search(r'\[.*]', content, re.DOTALL)
    if json_match:
        content = json_match.group(0)

    planned_items = json.loads(content)
    normalized_items = []
    for item in planned_items:
        planned = PlannedItem(
            project=item.get('project', ''),
            time=item.get('time', ''),
            happy=_safe_int(item.get('happy', 3)),
            meaningful=_safe_int(item.get('meaningful', 3)),
            extra=PlannedItemExtra(
                happy=item.get('extra', {}).get('happy', ''),
                meaningful=item.get('extra', {}).get('meaningful', ''),
                better=item.get('extra', {}).get('better', ''),
            ),
        )
        normalized_items.append(planned.model_dump())

    return normalized_items
