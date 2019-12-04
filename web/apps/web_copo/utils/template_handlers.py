# FS - 30/10/2019
from django.http import HttpResponse
from dal.copo_da import MetadataTemplate
from web.apps.web_copo import views
from django.urls import reverse
from bson import json_util
from dal.copo_da import MetadataTemplate
import pandas as pd
from io import BytesIO as IO
from wsgiref.util import FileWrapper
import web.apps.web_copo.lookup.lookup as lkup


def new_metadata_template(request):
    template_name = request.GET["template_name"]
    # record = MetadataTemplate()._new(profile_id=request.session["profile_id"], user_id=request.user.id, template_name=template_name)
    d = {"profile_id": request.session["profile_id"], "uid": request.user.id,
         "template_name": template_name}
    record = MetadataTemplate().save_record({}, **d)
    url = reverse("copo:author_template", args=[str(record["_id"])])
    return HttpResponse(url)


def update_metadata_template_name(request):
    template_name = request.GET["template_name"]
    template_id = request.GET["template_id"]
    new_name = MetadataTemplate().update_name(template_name=template_name, template_id=template_id)["template_name"]
    return HttpResponse(new_name)


def update_template(request):
    data = json_util.loads(request.POST["data"])
    template_id = request.POST["template_id"]
    record = MetadataTemplate().update_template(template_id=template_id, data=data)
    if (record):
        return HttpResponse(json_util.dumps({"data": data, "template_id": template_id}))
    else:
        return HttpResponse(status=500)


def load_metadata_template_terms(request):
    template_id = request.GET["template_id"]
    terms = MetadataTemplate().get_terms_by_template_id(template_id)
    if (terms):
        return HttpResponse(json_util.dumps(terms))
    else:
        return HttpResponse(status=500)


def export_template(request):
    template_id = json_util.loads(request.body)["template_id"]
    template = MetadataTemplate().get_terms_by_template_id(template_id)
    df = pd.DataFrame()
    for term in template["terms"]:
        column_heading = term["label"] + "/" + term["obo_id"]
        print(column_heading)
        df[column_heading] = []
    response = HttpResponse(content_type='text/csv')
    df.to_csv(path_or_buf=response, sep=',', float_format='%.2f', index=False, decimal=".")
    response['Content-Disposition'] = 'attachment; filename="export.csv"'
    return response


def get_wizard_types(request):
    names = lkup.WIZARD_FILES
    should_appear = lkup.TEMPLATES_TO_APPEAR_IN_EDITOR
    out = list()
    for el in should_appear:
        if el in names:
            # load json and extract title
            with open(names[el]) as data:
                j = json_util.loads(data.read())
                title = j["title"]
                out.append({"key": title, "value": names[el]})
    return HttpResponse(json_util.dumps(out))


def get_primer_fields(request):
    filename = request.GET["filename"]
    with open(filename) as jason:
        jason = json_util.loads(jason.read())
        fields = jason["properties"]
    return HttpResponse(json_util.dumps(fields))


def add_primer_fields(request):

    fields = request.POST["fields"]