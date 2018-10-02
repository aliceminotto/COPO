__author__ = 'etuka'
__date__ = '17 June 2016'

import json
import web.apps.web_copo.wizards.datafile.wizard_helper as wizh


class BrokerRequests:
    def __init__(self, **kwargs):
        self.param_dict = kwargs

        self.context = self.param_dict.get("context", dict())

        self.auto_fields = self.param_dict.get("auto_fields", dict())
        if self.auto_fields and isinstance(self.auto_fields, str):
            self.auto_fields = json.loads(self.auto_fields)

        self.target_id = self.param_dict.get("target_id", str())
        self.profile_id = self.param_dict.get("profile_id", str())
        self.description_token = self.param_dict.get("description_token", str())
        self.description_targets = self.param_dict.get("description_targets", list())  # subset of items in bundle

        # an wizard helper instance to handle request actions
        self.wizard_helper = wizh.WizardHelper(description_token=self.description_token, profile_id=self.profile_id)

    def get_request_dict(self):
        # request-to-action mapping
        request_dict = dict(initiate_description=self.do_initiate_description,
                            next_stage=self.do_next_stage,
                            get_description_bundle=self.do_get_description_bundle,
                            get_discrete_attributes=self.do_get_discrete_attributes,
                            get_cell_control=self.do_get_cell_control,
                            save_cell_data=self.do_save_cell_data,
                            batch_update=self.do_batch_update,
                            un_describe=self.do_un_describe,
                            get_description_records=self.do_description_records,
                            datafile_pairing=self.do_datafile_pairing,
                            datafile_unpairing=self.do_datafile_unpairing,
                            match_to_description=self.do_match_to_description,
                            unbundle_datafiles=self.do_unbundle_datafiles,
                            delete_description_record=self.do_delete_description_record,
                            get_unbundled_datafiles=self.do_get_unbundled_datafiles,
                            get_description_bundle_details=self.do_get_description_bundle_details,
                            initiate_submission=self.do_initiate_submission
                            )

        return request_dict

    def post_context(self, request_action):
        request_dict = self.get_request_dict()

        request_action = request_action.split(",")

        for rqa in request_action:
            if rqa in request_dict:
                request_dict[rqa]()

        return self.context

    def do_initiate_description(self):
        self.context['result'] = self.wizard_helper.initiate_description(self.description_targets)

    def do_next_stage(self):
        self.context['next_stage'] = self.wizard_helper.resolve_next_stage(self.auto_fields)

    def do_get_description_bundle(self):
        self.context['result'] = self.wizard_helper.get_description_bundle()

    def do_get_discrete_attributes(self):
        self.context['table_data'] = self.wizard_helper.generate_discrete_attributes()

    def do_save_cell_data(self):
        cell_reference = self.param_dict.get("cell_reference", str())
        self.context['cell_update'] = self.wizard_helper.save_cell_data(cell_reference, self.target_id,
                                                                        self.auto_fields)

    def do_get_cell_control(self):
        cell_reference = self.param_dict.get("cell_reference", str())
        self.context['cell_control'] = self.wizard_helper.get_cell_control(cell_reference, self.target_id)

    def do_un_describe(self):
        self.context['result'] = self.wizard_helper.discard_description(self.description_targets)

    def do_datafile_pairing(self):
        # call to pair datafiles - having library layout set to 'PAIRED'
        self.context['result'] = self.wizard_helper.datafile_pairing()

    def do_datafile_unpairing(self):
        # call to unpair datafiles
        self.context['result'] = self.wizard_helper.datafile_unpairing()

    def do_batch_update(self):
        cell_reference = self.param_dict.get("cell_reference", str())
        self.context['batch_update'] = self.wizard_helper.batch_update_cells(cell_reference, self.target_id,
                                                                             self.description_targets)

    def do_description_records(self):
        self.context['records'] = self.wizard_helper.get_description_records()

    def do_match_to_description(self):
        self.context['result'] = self.wizard_helper.match_to_description(self.description_targets)

    def do_unbundle_datafiles(self):
        self.context['result'] = self.wizard_helper.unbundle_datafiles(self.description_targets)

    def do_delete_description_record(self):
        self.context['result'] = self.wizard_helper.delete_description_record()

    def do_get_unbundled_datafiles(self):
        self.context['result'] = self.wizard_helper.get_unbundled_datafiles()

    def do_get_description_bundle_details(self):
        self.context['result'] = self.wizard_helper.get_description_record_details()

    def do_initiate_submission(self):
        self.context['result'] = self.wizard_helper.initiate_submission()
