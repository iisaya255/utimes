"""
UTimes API 路由
"""
import json
import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from api.models.record import Record, Extra, Users
from api.schemas.record import ConfigSaveRequest
from api.utils.auth import login_required
from api.utils.record_helpers import (
    validate_date_format,
    parse_record_content,
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
        data = parse_record_content(record.get('content', ''))
        if data is None:
            return make_response(success=False, message='数据格式错误', code=500)
        return make_response(data=data)
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
            json_content = req_data['content']
            date = req_data.get('date')
        elif 'content' in req_data and isinstance(req_data['content'], str):
            json_content = parse_record_content(req_data['content'])
            if json_content is None:
                return make_response(success=False, message='content格式错误', code=400)
            date = req_data.get('date')
        else:
            date = req_data.get('date')
            note = req_data.get('note', '')
            data_list = req_data.get('dataList', [])
            if not isinstance(data_list, list):
                return make_response(success=False, message='dataList必须是数组', code=400)
            json_content = {
                'todo': note,
                'topic': [],
                'dataList': data_list
            }

        if not date:
            return make_response(success=False, message='缺少date参数', code=400)

        if not validate_date_format(str(date)):
            return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

        # 排序
        dl = list(json_content.get('dataList', []))

        def custom_sort(s):
            big = float(s.get('meaningful', 0))
            small = float(s.get('happy', 0)) * 0.5
            return -(big + small)

        dl = sorted(dl, key=custom_sort)
        json_content['dataList'] = dl
        content = json.dumps(json_content, ensure_ascii=False)

        user_id = request.user.id
        Record.update_if_exist(user_id, date, content)

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
        result = build_record_response(record, include_extra_info=False)
        if result is None:
            return make_response(success=False, message='数据格式错误', code=500)
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
    extra_row = Extra.one(user_id=user_id)

    if record:
        result = build_record_response(record, extra_row=extra_row, include_extra_info=True)
        if result is None:
            return make_response(success=False, message='数据格式错误', code=500)
        return make_response(data=result)
    else:
        return make_response(data={
            'time': date,
            'extra2Text': extra_row.get('extra2', '') if extra_row else '',
            'extra3Links': extra_row.get('extra3', '') if extra_row else '',
            'extraInfo': extra_row.get('extra2', '') if extra_row else '',
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
    data_array = Record.search(query, user_id=user_id)
    ret = []
    for data in data_array:
        s = ''
        try:
            js = json.loads(data.get('content', ''))
            if query in js.get('todo', ''):
                s += js['todo']

            for info in js.get("dataList", []):
                extra_info = info.get("extra", {})
                c = extra_info.get('happy', '') + extra_info.get('meaningful', '') + extra_info.get('better', '')
                if query in c or query in info.get("project", ""):
                    s += c
            s = s.replace('\n\n', '\n')
            url = f'/detail/{data.get("date", "")}'
            ret.append(dict(date=data.get('date', ''), url=url, content=s))
        except json.JSONDecodeError:
            continue

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
            try:
                content_str = record.get('content', '')
                if '编程' in content_str or '代码' in content_str:
                    code += 1
                if '运动' in content_str:
                    fit += 1

                content = json.loads(content_str)
                items = content.get('dataList', [])
                for item in items:
                    project = item.get('project', '').strip()
                    if project == '':
                        continue
                    calendar_data[formatted_date].append({
                        'type': 'success',
                        'content': project
                    })
            except json.JSONDecodeError:
                pass

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
    data = Record.one(user_id=user_id, date=date)
    stores = []
    blanks = []

    if data:
        try:
            c = json.loads(data.get('content', ''))
            for info in c.get("dataList", []):
                if info.get('time', '').strip() == '':
                    blanks.append(info)
                else:
                    stores.append(info)

            c['dataList'] = stores
            content = json.dumps(c, ensure_ascii=False)
            if not blanks:
                return make_response(message='没有需要迁移的数据')
            else:
                Record.update_if_exist(user_id=user_id, date=date, content=content)
        except json.JSONDecodeError:
            return make_response(success=False, message='数据格式错误', code=500)

    next_day = Record.one(user_id=user_id, date=target)
    if next_day:
        try:
            c = json.loads(next_day.get('content', ''))
            c.get("dataList", []).extend(blanks)
            next_day_content = json.dumps(c, ensure_ascii=False)
            Record.update_if_exist(user_id=user_id, date=target, content=next_day_content)
        except json.JSONDecodeError:
            return make_response(success=False, message='目标日期数据格式错误', code=500)
    else:
        c = json.dumps(dict(
            topic=[],
            todo='',
            dataList=blanks
        ), ensure_ascii=False)
        Record.update_if_exist(user_id=user_id, date=target, content=c)

    return make_response(message=f'成功迁移{len(blanks)}条数据到{target}')


@api.route('/api/config', methods=['GET'])
@login_required
def api_config():
    """获取配置信息"""
    user_id = request.user.id
    extra_data = Extra.one(user_id=user_id)
    return make_response(data={
        'extra1': extra_data.get('extra1', '') if extra_data else '',
        'extra2': extra_data.get('extra2', '') if extra_data else '',
        'extra3': extra_data.get('extra3', '') if extra_data else '',
        'extra': extra_data.get('extra1', '') if extra_data else '',
    })


@api.route('/api/config', methods=['POST'])
@login_required
def api_config_save():
    """保存配置信息"""
    try:
        req_data = request.get_json()
        if not req_data:
            return make_response(success=False, message='请求体为空', code=400)

        # 兼容 extra 字段映射到 extra1
        if 'extra' in req_data and 'extra1' not in req_data:
            req_data['extra1'] = req_data.pop('extra')

        try:
            config = ConfigSaveRequest.model_validate(req_data)
        except ValidationError as e:
            first_error = e.errors()[0]
            field = first_error.get('loc', [''])[0]
            msg = first_error.get('msg', '验证失败')
            return make_response(success=False, message=f'{field}: {msg}', code=400)

        user_id = request.user.id
        extra_data = Extra.one(user_id=user_id)
        if extra_data:
            Extra.update(extra_data['id'], extra1=config.extra1, extra2=config.extra2, extra3=config.extra3)
        else:
            Extra.create({
                'user_id': user_id,
                'extra1': config.extra1,
                'extra2': config.extra2,
                'extra3': config.extra3,
                'extra4': '',
                'extra5': '',
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
        'is_public': bool(user.get('is_public', 0)),
    })


@api.route('/api/profile/<username>/detail/<date>', methods=['GET'])
def api_profile_detail(username, date):
    """获取用户公开的某天记录"""
    user = Users.one(username=username)
    if not user:
        return make_response(success=False, message='用户不存在', code=404)

    if not user.get('is_public', 0):
        return make_response(success=False, message='该用户未公开记录', code=403)

    if not validate_date_format(date):
        return make_response(success=False, message='日期格式错误，应为YYYYMMDD', code=400)

    # 用该用户的 user_id 查记录
    user_id = str(user['id'])
    record = Record.one(date=date, user_id=user_id)
    if record:
        result = build_record_response(record, include_extra_info=False)
        if result is None:
            return make_response(success=False, message='数据格式错误', code=500)
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
        user = Users.one(id=int(user_id) if user_id != '0' else 0)
        if not user:
            return make_response(success=False, message='用户不存在', code=404)

        is_public = 1 if req_data.get('is_public', False) else 0
        Users.update(user['id'], is_public=is_public)
        return make_response(message='设置保存成功')
    except Exception as e:
        logging.error(f'保存公开设置失败: {str(e)}', exc_info=True)
        return make_response(success=False, message='保存失败', code=500)
