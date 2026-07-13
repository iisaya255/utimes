"""
UTimes API 路由
"""
import json
import logging
from flask import Blueprint, request, jsonify

from api.models.record import Record, UserSettings, Users
from api.utils.auth import login_required
from api.utils.record_helpers import (
    validate_date_format,
    convert_items_to_response,
    build_record_response,
)

api = Blueprint('utimes_api', __name__)


def make_response(success=True, data=None, message='', code=200):
    """统一的 API 响应格式"""
    return jsonify({
        'success': success,
        'data': data,
        'message': message,
        'code': code
    }), code


@api.route('/api/render', methods=['GET'])
@login_required
def api_render():
    """获取指定日期的数据"""
    date = request.args.get('date')
    if not date:
        return make_response(success=False, message='缺少date参数', code=400)

    if not validate_date_format(date):
        return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

    user_id = request.user.id
    record = Record.one(date=date, user_id=user_id)
    if record:
        items = record.get('items', [])
        return make_response(data={
            'todo': record.get('note', ''),
            'topic': [],
            'dataList': items,
        })
    else:
        return make_response(data=None)


@api.route('/api/save', methods=['POST'])
@login_required
def api_save():
    """保存数据"""
    try:
        req_data = request.get_json()
        if not req_data:
            return make_response(success=False, message='请求体为空', code=400)

        # 支持两种格式
        if 'content' in req_data and isinstance(req_data['content'], dict):
            # 旧格式兼容：content: {todo, dataList}
            json_content = req_data['content']
            date = req_data.get('date')
            note = json_content.get('todo', '')
            data_list = json_content.get('dataList', [])
        elif 'content' in req_data and isinstance(req_data['content'], str):
            date = req_data.get('date')
            json_content = json.loads(req_data['content'])
            note = json_content.get('todo', '')
            data_list = json_content.get('dataList', [])
        else:
            date = req_data.get('date')
            note = req_data.get('note', '')
            data_list = req_data.get('dataList', [])

        if not date:
            return make_response(success=False, message='缺少date参数', code=400)

        if not validate_date_format(str(date)):
            return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

        if not isinstance(data_list, list):
            return make_response(success=False, message='dataList必须是数组', code=400)

        # 排序
        def custom_sort(s):
            big = float(s.get('meaningful', 0))
            small = float(s.get('happy', 0)) * 0.5
            return -(big + small)

        data_list = sorted(data_list, key=custom_sort)

        user_id = request.user.id
        Record.update_if_exist(user_id, date, note, data_list)

        return make_response(message='保存成功')
    except json.JSONDecodeError:
        return make_response(success=False, message='JSON格式错误', code=400)
    except ValueError as e:
        return make_response(success=False, message=f'数据验证失败: {str(e)}', code=400)
    except Exception as e:
        logging.error(f'保存数据失败: {str(e)}', exc_info=True)
        return make_response(success=False, message='保存失败', code=500)


@api.route('/api/detail/<date>', methods=['GET'])
@login_required
def api_detail(date):
    """获取详情数据"""
    if not validate_date_format(date):
        return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

    user_id = request.user.id
    record = Record.one(date=date, user_id=user_id)
    if record:
        result = build_record_response(record)
        return make_response(data=result)
    else:
        return make_response(data={
            'date': date,
            'time': date,
            'note': '',
            'items': [],
        })


@api.route('/api/edit/<date>', methods=['GET'])
@login_required
def api_edit(date):
    """获取编辑数据"""
    if not validate_date_format(date):
        return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

    user_id = request.user.id
    record = Record.one(date=date, user_id=user_id)
    settings = UserSettings.one(user_id=user_id)

    if record:
        result = build_record_response(record, settings_row=settings, include_settings=True)
        return make_response(data=result)
    else:
        return make_response(data={
            'time': date,
            'extra2Text': settings.get('daily_tips', '') if settings else '',
            'extra3Links': settings.get('quick_links', '') if settings else '',
            'extraInfo': settings.get('daily_tips', '') if settings else '',
            'note': '',
            'items': [],
        })


@api.route('/api/search', methods=['GET', 'POST'])
@login_required
def api_search():
    """搜索功能"""
    if request.method == 'GET':
        query = request.args.get('query', '')
    else:
        json_data = request.get_json()
        query = json_data.get('query', '') if json_data else ''

    if not query:
        return make_response(data=[])

    user_id = request.user.id
    records = Record.search(query, user_id=user_id)
    ret = []
    for record in records:
        s = ''
        note = record.get('note', '')
        if query in note:
            s += note

        items = record.get('items', [])
        for info in items:
            extra_info = info.get("extra", {})
            c = extra_info.get('happy', '') + extra_info.get('meaningful', '') + extra_info.get('better', '')
            if query in c or query in info.get("project", ""):
                s += c
        s = s.replace('\n\n', '\n')
        url = f'/detail/{record.get("date", "")}'
        ret.append(dict(date=record.get('date', ''), url=url, content=s))

    return make_response(data=ret)


@api.route('/api/calendar', methods=['GET'])
@login_required
def api_calendar():
    """获取日历数据"""
    user_id = request.user.id
    records = Record.all(user_id=user_id)
    code = 0
    fit = 0

    calendar_data = {}
    for record in records:
        date_str = str(record.get('date', ''))
        if len(date_str) == 8:
            formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            calendar_data[formatted_date] = []

            note = record.get('note', '')
            items = record.get('items', [])
            items_text = json.dumps(items, ensure_ascii=False) if isinstance(items, list) else str(items)

            if '编程' in note or '代码' in note or '编程' in items_text or '代码' in items_text:
                code += 1
            if '运动' in note or '运动' in items_text:
                fit += 1

            for item in items:
                project = item.get('project', '').strip()
                if project:
                    calendar_data[formatted_date].append({
                        'type': 'success',
                        'content': project
                    })

    return make_response(data={
        'calendar': calendar_data,
        'stats': {
            'total': len(records),
            'fit': fit,
            'code': code
        }
    })


@api.route('/api/migrate/<date>/<target>', methods=['POST'])
@login_required
def api_migrate(date, target):
    """数据迁移 - 将未完成项移到目标日期"""
    user_id = request.user.id
    record = Record.one(user_id=user_id, date=date)
    stores = []
    blanks = []

    if record:
        items = record.get('items', [])
        for info in items:
            if info.get('time', '').strip() == '':
                blanks.append(info)
            else:
                stores.append(info)

        if not blanks:
            return make_response(message='没有需要迁移的数据')

        Record.update_if_exist(user_id=user_id, date=date, note=record.get('note', ''), items=stores)

    next_day = Record.one(user_id=user_id, date=target)
    if next_day:
        existing_items = next_day.get('items', [])
        existing_items.extend(blanks)
        Record.update_if_exist(user_id=user_id, date=target, note=next_day.get('note', ''), items=existing_items)
    else:
        Record.update_if_exist(user_id=user_id, date=target, note='', items=blanks)

    return make_response(message=f'成功迁移{len(blanks)}条数据到{target}')


@api.route('/api/config', methods=['GET'])
@login_required
def api_config():
    """获取配置信息"""
    user_id = request.user.id
    settings = UserSettings.one(user_id=user_id)
    return make_response(data={
        'ai_context': settings.get('ai_context', '') if settings else '',
        'daily_tips': settings.get('daily_tips', '') if settings else '',
        'quick_links': settings.get('quick_links', '') if settings else '',
        # 兼容旧前端字段名
        'extra1': settings.get('ai_context', '') if settings else '',
        'extra2': settings.get('daily_tips', '') if settings else '',
        'extra3': settings.get('quick_links', '') if settings else '',
        'extra': settings.get('ai_context', '') if settings else '',
    })


@api.route('/api/config', methods=['POST'])
@login_required
def api_config_save():
    """保存配置信息"""
    try:
        req_data = request.get_json()
        if not req_data:
            return make_response(success=False, message='请求体为空', code=400)

        # 兼容新旧字段名
        ai_context = req_data.get('ai_context', req_data.get('extra1', req_data.get('extra', '')))
        daily_tips = req_data.get('daily_tips', req_data.get('extra2', ''))
        quick_links = req_data.get('quick_links', req_data.get('extra3', ''))

        user_id = request.user.id
        settings = UserSettings.one(user_id=user_id)
        if settings:
            UserSettings.update(settings['id'], ai_context=ai_context, daily_tips=daily_tips, quick_links=quick_links)
        else:
            UserSettings.create({
                'user_id': user_id,
                'ai_context': ai_context,
                'daily_tips': daily_tips,
                'quick_links': quick_links,
            })

        return make_response(message='配置保存成功')
    except Exception as e:
        logging.error(f'保存配置失败: {str(e)}', exc_info=True)
        return make_response(success=False, message='保存失败', code=500)


@api.route('/api/openai/summarize-week', methods=['POST'])
@login_required
def api_openai_summarize_week():
    """AI 总结最近一周"""
    try:
        from api.services.ai_service import summarize_week
        user_id = request.user.id
        summary = summarize_week(user_id)
        return make_response(data={'summary': summary})
    except Exception as e:
        logging.error(f'总结最近一周数据失败: {str(e)}', exc_info=True)
        return make_response(success=False, message=f'总结失败: {str(e)}', code=500)


@api.route('/api/openai/plan-today', methods=['POST'])
@login_required
def api_openai_plan_today():
    """AI 规划今天"""
    try:
        from api.services.ai_service import plan_today
        user_id = request.user.id
        items = plan_today(user_id)
        return make_response(data={'items': items})
    except Exception as e:
        logging.error(f'规划今天任务失败: {str(e)}', exc_info=True)
        return make_response(success=False, message=f'规划失败: {str(e)}', code=500)


@api.route('/api/users', methods=['GET'])
@login_required
def api_users():
    users = Users.all()
    return make_response(data=users)


@api.route('/api/profile/<username>', methods=['GET'])
def api_profile(username):
    """获取用户公开信息"""
    user = Users.one(username=username)
    if not user:
        return make_response(success=False, message='用户不存在', code=404)
    return make_response(data={
        'username': user.get('username', ''),
        'name': user.get('name', ''),
        'avatar': user.get('avatar', ''),
        'bio': user.get('bio', ''),
        'is_public': bool(user.get('is_public', False)),
    })


@api.route('/api/profile/<username>/detail/<date>', methods=['GET'])
def api_profile_detail(username, date):
    """获取用户公开的某天记录"""
    user = Users.one(username=username)
    if not user:
        return make_response(success=False, message='用户不存在', code=404)

    if not user.get('is_public', False):
        return make_response(success=False, message='该用户未公开记录', code=403)

    if not validate_date_format(date):
        return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

    user_id = str(user.get('user_id', user.get('id', '')))
    record = Record.one(date=date, user_id=user_id)
    if record:
        result = build_record_response(record)
        return make_response(data=result)
    else:
        return make_response(data={
            'date': date,
            'time': date,
            'note': '',
            'items': [],
        })


@api.route('/api/profile/settings', methods=['POST'])
@login_required
def api_profile_settings():
    """更新当前用户的公开设置"""
    try:
        req_data = request.get_json()
        if not req_data:
            return make_response(success=False, message='请求体为空', code=400)

        user_id = request.user.id
        user = Users.one(user_id=user_id)
        if not user:
            return make_response(success=False, message='用户不存在', code=404)

        is_public = bool(req_data.get('is_public', False))
        Users.update(user['id'], is_public=is_public)
        return make_response(message='设置保存成功')
    except Exception as e:
        logging.error(f'保存公开设置失败: {str(e)}', exc_info=True)
        return make_response(success=False, message='保存失败', code=500)
