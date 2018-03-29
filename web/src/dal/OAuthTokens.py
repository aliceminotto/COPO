__author__ = 'felix.shaw@tgac.ac.uk - 29/01/2016'

from dal.mongo_util import get_collection_ref
import datetime
import requests
from requests.auth import HTTPBasicAuth
from web.apps.web_copo.schemas.utils import data_utils
import bson
#from bson.json_util import json as j
from django_tools.middlewares import ThreadLocal
import json
OAuthCollectionName = 'OAuthToken'


class OAuthToken:
    def __init__(self):
        self.OAuthToken = get_collection_ref('OAuthToken')

    def get_figshare_by_user(self, user):
        doc = self.OAuthToken.find_one({'service': 'figshare', 'user': user})
        if doc:
            return doc
        else:
            return False

    def cyverse_get_token(self, user):
        doc = self.OAuthToken.find_one({'service': 'cyverse', 'user': user})
        if doc:
            session = ThreadLocal.get_current_request().session
            session['cyverse_token'] = bson.json_util.dumps(doc)
            return doc
        else:
            return False

    def cyverse_delete_token(self, user):
        return self.OAuthToken.delete_many({"user": user})

    def cyverse_save_token(self, user, token):
        return self.OAuthToken.insert(
            {'service': 'cyverse', 'user': user, 'token': token, 'issued': datetime.datetime.now()}
        )

    def cyverse_update_token(self, old_token, new_token):
        return self.OAuthToken.replace_one({'_id': old_token['_id']},
                                           {'service': 'cyverse', 'user': data_utils.get_user().user,
                                            'token': new_token,
                                            'issued': datetime.datetime.now()}
                                           )

    def check_token(self, token):
        now = datetime.datetime.now()
        then = token['issued']
        # cyverse tokens expire 4 hours after issue, so check if refresh is needed
        delta = now - then
        # 14350
        max_delta = datetime.timedelta(seconds=14350)
        if delta > max_delta:
            post_data = {'grant_type': 'refresh_token', 'refresh_token': token['token']['refresh_token'],
                         'scope': 'PRODUCTION'}
            headers = {"Authorization": "Authorization: Basic gAnX96MinyBfZ_gsvkr0nEDLpR8a:KOm9gFBPVwq6sfCMgumZRJG5j8wa"}
            #auth = ('KOm9gFBPVwq6sfCMgumZRJG5j8wa', 'gAnX96MinyBfZ_gsvkr0nEDLpR8a')
            resp = requests.post("https://agave.iplantc.org/oauth2/token", data=post_data, auth = HTTPBasicAuth('KOm9gFBPVwq6sfCMgumZRJG5j8wa', 'gAnX96MinyBfZ_gsvkr0nEDLpR8a'))
            if resp.status_code == 200:
                new_token = json.loads(resp.content.decode('utf-8'))
                update_status = self.cyverse_update_token(token, new_token)
                if update_status['acknowledged'] == True:
                    return new_token
        else:
            return token

    def call_agave(self, url, params=None):
        user = ThreadLocal.get_current_user().id
        token = self.check_token(self.cyverse_get_token(user))
        headers = {"Authorization": "Bearer " + token['token']['access_token']}
        resp = requests.get(url, headers=headers)
        return json.loads(resp.content.decode('utf-8'))

