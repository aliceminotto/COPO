__author__ = 'etuka'
__date__ = '02 April 2019'

import os
import pandas as pd
from bson import ObjectId
from datetime import datetime
from dal import cursor_to_list
from django.conf import settings
from collections import defaultdict
import web.apps.web_copo.schemas.utils.data_utils as data_utils
from web.apps.web_copo.lookup.copo_enums import Loglvl, Logtype
from dal.copo_da import Submission, Person, Description, DataFile, Sample, DAComponent

lg = settings.LOGGER


class SubmissionHelper:
    def __init__(self, submission_id=str()):
        self.submission_id = submission_id
        self.submission_record = Submission().get_record(self.submission_id)
        self.profile_id = str()
        self.description = dict()
        self.__converter_errors = list()

        self.profile_id = self.submission_record.get("profile_id", str())
        self.description_token = self.submission_record.get("description_token", str())

        self.description = Description().GET(self.description_token)

    def get_converter_errors(self):
        return self.__converter_errors

    def flush_converter_errors(self):
        self.__converter_errors = list()

    def get_pairing_info(self):
        """
        function returns information about datafiles pairing
        :return:
        """

        datafiles_pairing = self.description.get("attributes", dict()).get("datafiles_pairing", list())

        return datafiles_pairing

    def get_sra_contacts(self):
        """
        function returns users with any SRA roles
        :return:
        """

        sra_contacts = defaultdict(list)
        expected_roles = [x.lower() for x in ['SRA Inform On Status', 'SRA Inform On Error']]

        for rec in Person(profile_id=self.profile_id).get_all_records():
            roles = [role.get("annotationValue", str()).lower() for role in rec.get('roles', []) if
                     role.get("annotationValue", str()).lower() in expected_roles]
            if roles:
                sra_contacts[(rec['email'], rec['firstName'], rec['lastName'])].extend(roles)

        # if no sra contacts, add one from session user
        if not sra_contacts:
            user = data_utils.get_current_user()
            sra_contacts[(user.email, user.first_name, user.last_name)].append(expected_roles)

        return sra_contacts

    def get_study_release(self):
        """
        function returns the release date for a study
        :return:
        """

        release_date = dict()

        if not self.description:
            return release_date

        attributes = self.description.get("attributes", dict())
        release_date = attributes.get("project_details", dict()).get("project_release_date", str())

        if release_date:
            release_date = datetime.strptime(release_date, '%d/%m/%Y').strftime('%Y-%m-%d')
            present = datetime.now()
            past = datetime.strptime(release_date, "%Y-%m-%d")

            return dict(release_date=release_date, in_the_past=past.date() <= present.date())

        return release_date

    def get_study_descriptors(self):
        """
        function returns descriptors for a study e.g., name, title, description
        :return:
        """

        study_attributes = dict()

        if not self.description:
            return study_attributes

        attributes = self.description.get("attributes", dict())
        study_attributes["name"] = attributes.get("project_details", dict()).get("project_name", str())
        study_attributes["title"] = attributes.get("project_details", dict()).get("project_title", str())
        study_attributes["description"] = attributes.get("project_details", dict()).get("project_description", str())

        return study_attributes

    def get_sra_samples(self, submission_location=str()):
        """
        function retrieves study samples and presents them in a format for building an sra sample set
        :param submission_location:
        :return:
        """

        sra_samples = list()

        # get datafiles
        datafiles = cursor_to_list(
            DataFile().get_collection_handle().find(
                {"description_token": self.description_token, 'deleted': data_utils.get_not_deleted_flag()},
                {'_id': 1, 'file_location': 1, "description.attributes": 1, "name": 1}))

        if not len(datafiles):
            self.__converter_errors.append("No datafiles found in submission!")
            return sra_samples

        df = pd.DataFrame(datafiles)
        df['file_id'] = df._id.astype(str)
        df['file_path'] = df['file_location'].fillna('')
        df['upload_status'] = False

        df = df[['file_id', 'file_path', 'upload_status']]
        bundle = list(df.file_id)
        bundle_meta = df.to_dict('records')

        submission_record = Submission().get_record(self.submission_id)
        submission_record['bundle'] = bundle
        submission_record['bundle_meta'] = bundle_meta
        submission_record['target_id'] = str(submission_record.pop('_id'))

        Submission().save_record(dict(), **submission_record)

        samples_id = list()
        df_attributes = []  # holds datafiles attributes

        for datafile in datafiles:
            datafile_attributes = [v for k, v in datafile.get("description", dict()).get("attributes", dict()).items()]
            new_dict = dict()
            for d in datafile_attributes:
                new_dict.update(d)

            new_dict['datafile_id'] = str(datafile['_id'])
            new_dict['datafile_name'] = datafile.get('name', str())
            new_dict['datafile_location'] = datafile.get('file_location', str())

            df_attributes.append(new_dict)

        # process datafiles attributes
        df_attributes_df = pd.DataFrame(df_attributes)
        df_columns = df_attributes_df.columns

        # replace null values
        for k in df_columns:
            df_attributes_df[k].fillna('', inplace=True)

        if 'study_samples' in df_columns:
            df_attributes_df['study_samples'] = df_attributes_df['study_samples'].apply(
                lambda x: x[0] if isinstance(x, list) else x.split(",")[-1])
            samples_id = list(df_attributes_df['study_samples'].unique())
            samples_id = [x for x in samples_id if x]

        if not samples_id:
            self.__converter_errors.append("No samples associated with datafiles!")
            return sra_samples

        file_path = os.path.join(submission_location, "datafiles.csv")
        df_attributes_df.to_csv(path_or_buf=file_path, index=False)

        samples_id_object_list = [ObjectId(sample_id) for sample_id in samples_id]
        samples_record = cursor_to_list(Sample().get_collection_handle().find({"_id": {"$in": samples_id_object_list}}))

        # get sources
        sources = DAComponent(profile_id=self.profile_id, component="source").get_all_records()
        sra_sources = dict()

        for source in sources:
            sra_source = dict()
            sra_sources[str(source["_id"])] = sra_source

            sra_source["name"] = source["name"]
            sra_source["taxon_id"] = source.get("organism", dict()).get('termAccession', str())
            if 'NCBITaxon_' in sra_source["taxon_id"]:
                sra_source["taxon_id"] = sra_source["taxon_id"].split('NCBITaxon_')[-1]

            sra_source["scientific_name"] = source.get("organism", dict()).get('annotationValue', str())
            sra_source['attributes'] = self.get_attributes(source.get("characteristics", list()))
            sra_source['attributes'] = sra_source['attributes'] + self.get_attributes(
                source.get("factorValues", list()))

        for sample in samples_record:
            sra_sample = dict()
            sra_sample['sample_id'] = str(sample['_id'])
            sra_sample['name'] = sample['name']
            sra_sample['attributes'] = self.get_attributes(sample.get("characteristics", list()))
            sra_sample['attributes'] = sra_sample['attributes'] + self.get_attributes(
                sample.get("factorValues", list()))

            # retrieve sample source
            source_id = sample.get("derivesFrom", list())
            source_id = source_id[0] if source_id else ''
            sample_source = sra_sources.get(source_id, dict())

            if sample_source:
                sra_sample['attributes'].append(dict(tag="Source Name", value=sample_source.get("name", str())))
            else:
                self.__converter_errors.append("Sample: " + sample['name'] + " has no source information")

            if sample_source.get("taxon_id", str()):
                sra_sample['taxon_id'] = sample_source.get("taxon_id", str())
            else:
                self.__converter_errors.append("Sample: " + sample[
                    'name'] + " has no TAXON_ID. Please make sure an organism has "
                              "been set for the source of this sample from an ontology.")

            if sample_source.get("scientific_name", str()):
                sra_sample['scientific_name'] = sample_source.get("scientific_name", str())
            else:
                self.__converter_errors.append("Sample: " + sample[
                    'name'] + " has no SCIENTIFIC_NAME. Please make sure an organism has "
                              "been set for the source of this sample from an ontology.")

            if sample_source.get("attributes", list()):
                sra_sample['attributes'] = sra_sample['attributes'] + sample_source.get("attributes", list())

            sra_samples.append(sra_sample)

        return sra_samples

    def get_attributes(self, attributes):
        """
        function sorts attributes to tag/value and/or unit pair
        :param attributes:
        :return:
        """

        resolved_attributes = list()

        if not attributes:
            return resolved_attributes

        for atrib in attributes:
            tag = atrib.get("category", dict()).get("annotationValue", str()).strip()
            value = atrib.get("value", dict()).get("annotationValue", str()).strip()
            unit = atrib.get("unit", dict()).get("annotationValue", str()).strip()

            if not any(x for x in [tag, value, unit]):
                continue

            valid = True
            feedback = list()

            attribute = dict(tag=tag, value=value, unit=unit)

            if not tag:
                valid = False
                feedback.append('Attribute category not defined')

            if not value:
                valid = False
                feedback.append('Attribute value not defined')

            is_numeric = False

            try:
                float(value)
            except ValueError:
                pass
            else:
                is_numeric = True
                if not unit:
                    valid = False
                    feedback.append('Numeric attribute requires a unit')

            if is_numeric is False:
                del attribute["unit"]

            # store attribute if valid, error otherwise
            if valid is False:
                self.__converter_errors.append((attribute, feedback))
            else:
                resolved_attributes.append(attribute)

        return resolved_attributes

    def logging_error(self, message):
        """
        function provides a consistent way of logging error during submission
        :param message:
        :return:
        """
        try:
            lg.log('[Submission: ' + self.submission_id + '] ' + message, level=Loglvl.ERROR, type=Logtype.FILE)
        except Exception as e:
            pass

        return False

    def logging_info(self, message):
        """
        function provides a consistent way of logging submission status/information
        :param message:
        :return:
        """
        lg.log('[Submission: ' + self.submission_id + '] ' + message, level=Loglvl.INFO, type=Logtype.FILE)

    def get_study_accessions(self):
        """
        function returns study accessions
        :param accessions:
        :return:
        """

        records = cursor_to_list(
            Submission().get_collection_handle().find({"_id": ObjectId(self.submission_id)}, {"accessions.project": 1}))

        if not records:
            return list()

        accessions = records[0].get('accessions', dict()).get('project', list())

        return accessions

    def get_sample_accessions(self):
        """
        function returns sample accessions
        :return:
        """

        records = cursor_to_list(
            Submission().get_collection_handle().find({"_id": ObjectId(self.submission_id)}, {"accessions.sample": 1}))

        if not records:
            return list()

        accessions = records[0].get('accessions', dict()).get('sample', list())

        return accessions

    def get_run_accessions(self):
        """
        function returns datafiles (runs) accessions
        :return:
        """

        records = cursor_to_list(
            Submission().get_collection_handle().find({"_id": ObjectId(self.submission_id)}, {"accessions.run": 1}))

        if not records:
            return list()

        accessions = records[0].get('accessions', dict()).get('run', list())

        return accessions

    def add_submission_error(self, message):
        """
        function stores submission error in the db
        :param message:
        :return:
        """

        if message:
            submission_record = Submission().get_record(self.submission_id)
            transcript = submission_record.get("transcript", dict())
            error = transcript.get("error", list())
            error.append(message)
            transcript['error'] = error

            submission_record['transcript'] = transcript
            submission_record['target_id'] = str(submission_record.pop('_id'))

            Submission().save_record(dict(), **submission_record)

        return True

    def clear_submission_error(self):
        """
        function clears submission error from the db
        :return:
        """

        submission_record = Submission().get_record(self.submission_id)
        transcript = submission_record.get("transcript", dict())
        transcript.pop('error', '')

        submission_record['transcript'] = transcript
        submission_record['target_id'] = str(submission_record.pop('_id'))

        Submission().save_record(dict(), **submission_record)

        return True
