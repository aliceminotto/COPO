# module provides a lookup service for various resources

import os
from .resolver import RESOLVER

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# DB_TEMPLATES dictionary provides paths to database templates
DB_TEMPLATES = {
    'COPO_COLLECTION_HEAD_FILE': os.path.join(RESOLVER['schemas_copo'], 'collection_head_model.json'),
    'REMOTE_FILE_COLLECTION': os.path.join(RESOLVER['schemas_copo'], 'aspera_db_model.json'),
    'PERSON': os.path.join(RESOLVER['isa_json_db_models'], 'person_schema.json'),
    'PUBLICATION': os.path.join(RESOLVER['isa_json_db_models'], 'publication_schema.json'),
    'SAMPLE': os.path.join(RESOLVER['isa_json_db_models'], 'sample_schema.json'),
    'DATA': os.path.join(RESOLVER['isa_json_db_models'], 'data_schema.json'),
    'SUBMISSION': os.path.join(RESOLVER['isa_json_db_models'], 'copo_submission.json'),
    'ONTOLOGY_ANNOTATION': os.path.join(RESOLVER['isa_json_db_models'], 'ontology_annotation_schema.json'),
    'COMMENT': os.path.join(RESOLVER['isa_json_db_models'], 'comment_schema.json'),
}

# SRA_SETTINGS PATHS
SRA_SETTINGS = os.path.join(RESOLVER['schemas_generic'], 'sra_settings.json')
SRA_COMMENTS = os.path.join(RESOLVER['schemas_generic'], 'sra_comments.json')

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# API_RETURN_TEMPLATES dictionary provides paths to api return templates
API_RETURN_TEMPLATES = {
    'WRAPPER': os.path.join(RESOLVER['api_return_templates'], 'template_wrapper.json'),
    'PERSON': os.path.join(RESOLVER['api_return_templates'], 'person.json'),
    'SAMPLE': os.path.join(RESOLVER['api_return_templates'], 'sample.json'),
    'SOURCE': os.path.join(RESOLVER['api_return_templates'], 'source.json')
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# API_ERRORS dictionary provides paths to api return templates
API_ERRORS = {
    'NOT_FOUND': 'resource not found',
    'CONNECTION_ERROR': 'internal error, please try later',
    'INVALID_PARAMETER': 'badly formed parameter',
    'UNKNOWN_ERROR': 'unknown error - please contact the administrator'
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#

# path to UI mapping schemas:
UI_CONFIG_MAPPINGS = os.path.join(RESOLVER['uimodels_copo'], 'mappings')

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# X_FILES dictionary holds paths other (non-categorised) schemas
X_FILES = {
    'ISA_JSON_REFACTOR_TYPES': '',
    'SAMPLE_ATTRIBUTES': ''
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# ATTRIBUTE_MAPPINGS dictionary holds mappings from one schema element to another
ATTRIBUTE_MAPPINGS = {
    'isa_xml': {
        'label': 'header',
        'control': 'data-type',
        'required': 'is-required',
        'hidden': 'is-hidden',
        'default_value': '',
        'option_values': '',
        'help_tip': ''
    },
    'ENA_DOI_PUBLICATION_MAPPINGS': {
        'title': 'dc:title',
        'authorList': 'dc:creator',
        'doi': 'dc:identifier_doi',
        'pubMedID': 'dc:identifier_pmid',
        'status': 'dc:status'
    }
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# CONTROL_MAPPINGS dictionary holds mappings between elements in different schemas
CONTROL_MAPPINGS = {
    'isa_xml': {
        'String': 'text',
        'Long String': 'textarea',
        'List': 'select'
        # 'Ontology term':?
    }
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# Repository file types - extensions suitable for different repositories
REPO_FILE_EXTENSIONS = {
    'ena': ['bam', 'fastq', 'sam'],
    'figshare': ['gif', 'jpeg', 'pdf', 'png', 'py', 'doc', 'ppt', 'docx']
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# define options for drop-downs
# wrapping items up in lists to maintain order
# for upgrades, only update the label, but the 'value' field should remain intact
# for referencing in codes.


# !!!!!   MAKE SURE VOCAB REPO NAMES AND DROPDOWN REPOSITORIES ARE IN SYNC
DROP_DOWNS = {
    'COLLECTION_TYPES': [
        {
            'value': 'dummy',
            'label': 'Select Collection Type...',
            'description': 'dummy item'
        },
        {
            'value': 'ENA Submission',
            'label': 'ENA Submission',
            'description': 'Submission to the ENA repository'
        },
        {
            'value': 'Figshare',
            'label': 'PDF File',
            'description': ''
        },
        {
            'value': 'Figshare',
            'label': 'Image',
            'description': ''
        },
        {
            'value': 'Movie',
            'label': 'Movie',
            'description': ''
        },
        {
            'value': 'Other',
            'label': 'Other',
            'description': 'Miscellaneous data file'
        }
    ],
    'STUDY_TYPES': [
        {
            'value': 'genomeSeq',  # this matches the value defined in the object_model.py
            'label': 'Whole Genome Sequencing',
            'description': 'genome sequencing',
            'config_source': 'genome_seq.xml'
        },
        {
            'value': 'metagenomeSeq',
            'label': 'Metagenomics',
            'description': 'metagenome sequencing',
            'config_source': 'metagenome_seq.xml'
        },
        {
            'value': 'transcriptomeAnalysis',
            'label': 'Transcriptome Analysis',
            'description': '',
            'config_source': 'transcription_seq.xml'
        },
        {
            'value': 'resequencing',
            'label': 'Resequencing',
            'description': '',
            'config_source': 'genome_seq.xml'
        },
        # {
        #     'value': 'epigenetics',
        #     'label': 'Epigenetics',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'syntheticGenomics',
        #     'label': 'Synthetic Genomics',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'forensicOrPaleo-genomics',
        #     'label': 'Forensic or Paleo-genomics',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'geneRegulationStudy',
        #     'label': 'Gene Regulation Study',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'cancerGenomics',
        #     'label': 'Cancer Genomics',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'populationGenomics',
        #     'label': 'Population Genomics',
        #     'description': '',
        #     'config_source': ''
        # },
        {
            'value': 'rNASeq',
            'label': 'RNASeq',
            'description': '',
            'config_source': 'transcription_seq.xml'
        },
        # {
        #     'value': 'exomeSequencing',
        #     'label': 'Exome Sequencing',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'pooledCloneSequencing',
        #     'label': 'Pooled Clone Sequencing',
        #     'description': '',
        #     'config_source': ''
        # },
        # {
        #     'value': 'Other',
        #     'label': 'Other',
        #     'description': 'Some random study',
        #     'config_source': ''
        # }
    ],
    'FIGSHARE_CATEGORIES': [
        {
            'value': 'Cell Biology',
            'label': 'Cell Biology',
            'description': ''
        },
        {
            'value': 'Molecular Biology',
            'label': 'Molecular Biology',
            'description': ''
        },
        {
            'value': 'Cancer',
            'label': 'Cancer',
            'description': ''
        },
        {
            'value': 'Bioinformatics',
            'label': 'Bioinformatics',
            'description': ''
        },
        {
            'value': 'Computational Biology',
            'label': 'Computational Biology',
            'description': ''
        },
        {
            'value': 'Proteomics',
            'label': 'Proteomics',
            'description': ''
        },
        {
            'value': 'Synthetic Biology',
            'label': 'Synthetic Biology',
            'description': ''
        },
        {
            'value': 'Genomics',
            'label': 'Genomics',
            'description': ''
        },
        {
            'value': 'Genetically Modified Field and Crop Pasture',
            'label': 'Genetically Modified Field and Crop Pasture',
            'description': ''
        }
    ],
    "FIGSHARE_ARTICLE_TYPES": [
        {
            'value': 'figure',
            'label': 'Figure (Figures, Images)'
        },
        {
            'value': 'media',
            'label': 'Media (Videos, Audio)'
        },
        {
            'value': 'dataset',
            'label': 'Dataset (Tables, Statistics)'
        },
        {
            'value': 'poster',
            'label': 'Poster (Illustrations, Diagrams)'
        },
        {
            'value': 'paper',
            'label': 'Paper (Publication, Documents)'
        },
        {
            'value': 'presentation',
            'label': 'Presentation (Slides)'
        },
        {
            'value': 'thesis',
            'label': 'Thesis (Essays, Dissertations)'
        },
        {
            'value': 'code',
            'label': 'Code (Scripts, Classes, Binaries)'
        }

    ],
    "DATAVERSE_SUBJECTS": [
        {
            'value': 'Arts and Humanities',
            'label': 'Arts and Humanities',
        },
        {
            'value': 'Computer and Information Science',
            'label': 'Computer and Information Science',
        },
        {
            'value': 'Law',
            'label': 'Law',
        },
        {
            'value': 'Engineering',
            'label': 'Engineering',
        },
        {
            'value': 'Social Sciences',
            'label': 'Social Sciences',
        },
        {
            'value': 'Medicine, Health and Life Sciences',
            'label': 'Medicine, Health and Life Sciences',
        },
        {
            'value': 'Agricultural Sciences',
            'label': 'Agricultural Sciences',
        },
        {
            'value': 'Astronomy and Astrophysics',
            'label': 'Astronomy and Astrophysics',
        },
        {
            'value': 'Business and Management',
            'label': 'Business and Management',
        },
        {
            'value': 'Chemistry',
            'label': 'Chemistry',
        },
        {
            'value': 'Earth and Environmental Sciences',
            'label': 'Earth and Environmental Sciences',
        },
        {
            'value': 'Mathematical Sciences',
            'label': 'Mathematical Sciences',
        },
        {
            'value': 'Physics',
            'label': 'Physics',
        },
        {
            'value': 'Other',
            'label': 'Other',
        }
    ],
    "LICENSE_TYPES": [
        {
            'value': 'Apache-2.0',
            'label': 'Apache-2.0'
        },
        {
            'value': 'CC-0',
            'label': 'CC-0'
        },
        {
            'value': 'CC-BY',
            'label': 'CC-BY'
        },
        {
            'value': 'GPL',
            'label': 'GPL'
        },
        {
            'value': 'GPL-2.0',
            'label': 'GPL-2.0'
        },
        {
            'value': 'GPL-3.0',
            'label': 'GPL-3.0'
        },
        {
            'value': 'MIT',
            'label': 'MIT'
        },
    ],
    "YES_NO": [
        {
            'value': 'True',
            'label': 'Yes'
        },
        {
            'value': 'False',
            'label': 'No'
        }
    ],
    "REPOSITORIES": [
        {
            'value': 'ena',
            'label': 'European Nucleotide Archive (ENA)'
        },
        {
            'value': 'figshare',
            'label': 'Figshare'
        },
        {
            'value': 'miappe',
            'label': 'MIAPPE Compliant'
        },
        {
            'value': 'dcterms',
            'label': 'Dataverse'
        }
        # {
        #     'value': 'MetaboLights',
        #     'label': 'MetaboLights'
        # },
        # {
        #     'value': 'unknown',
        #     'label': 'Unknown'
        # }
    ],
    "SAMPLE_TYPES": [
        {
            "value": "biosample",
            "label": "Simple",
            "description": "Simple samples are based on BioSamples. They are <strong>repository agnostic</strong>, and are better suited for describing samples in a generic manner or in contexts where the target repository isn't known <i>a priori</i>."
        },
        {
            "value": "isasample",
            "label": "Extended",
            "description": "Extended samples are based on the Investigation, Study and Assay (ISA) specifications, and are better tailored for describing samples that will subsequently become part of data submissions to repositories such as <strong>ENA</strong> and <strong>Metabolights</strong>."
        }
    ],
    "GROWTH_AREAS": [
        {
            "value": "growth_chamber_GC",
            "label": "Growth Chamber"
        },
        {
            "value": "greenhouse_rooting",
            "label": "Greenhouse",
            "schema": "miappe_rooting_greenhouse"
        },
        {
            "label": "Open_Top_Chamber",
            "value": "open top chamber, OTC"
        },
        {
            "value": "experimental_garden",
            "label": "Experimental Garden"
        },
        {
            "label": "Experimental_Field",
            "value": "field_rooting",
            "schema": "miappe_rooting_field"
        }
    ],
    "ROOTING_MEDIUM": [
        {
            "value": "aeroponics",
            "label": "Aeroponics"
        },
        {
            "value": "hydroponics_water_based",
            "label": "Hydroponics (water based)"
        },
        {
            "value": "hydroponics_solid-media_based",
            "label": "Hydroponics (solid-media based)"
        },
        {
            "value": "soil_sand",
            "label": "Soil (sandy)"
        },
        {
            "value": "soil_peat",
            "label": "Soil (peat)"
        },
        {
            "value": "soil_clay",
            "label": "Soil (clay)"
        },
        {
            "value": "soil_mixed",
            "label": "Soil (mixed)"
        },
        {
            "value": "other",
            "label": "Other"
        }
    ],
    "GROWTH_NUTRIENTS": [
        {
            "value": "hydroponics",
            "label": "Hydroponics",
            "schema": "hydroponics"
        },
        {
            "value": "soil",
            "label": "Soil",
            "schema": "soil"
        }
    ],
    "WATERING_OPTIONS": [
        {
            "value": "top",
            "label": "Top"
        },
        {
            "value": "bottom",
            "label": "Bottom"
        },
        {
            "value": "drip",
            "label": "Drip"
        }
    ]
}

# !!!!!   MAKE SURE VOCAB REPO NAMES AND DROPDOWN REPOSITORIES ARE IN SYNC
VOCAB = {
    "REPO_NAMES": {
        "figshare": {"value": "figshare",
                     "label": "Figshare"},
        "ena": {"value": "ena",
                "label": "European Nucleotide Archive (ENA)"
                },
        "metab": {"value": "metabolights",
                  "label": "metabolights"},
        "bip": {"value": "bip",
                "label": "Brassica Information Portal"}
    },
    "DA_COMPONENTS": {
        "submission": {
            "value": "submission"
        },
        "source": {
            "value": "source"
        },
        "sample": {
            "value": "sample"
        },
        "profile": {
            "value": "profile"
        },
        "datafile": {
            "value": "datafile"
        },
        "publication": {
            "value": "publication"
        },
        "person": {
            "value": "person"
        },

    },

}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# THIS IS DEPRECATED!!! SEE copo_form_handlers.js
# tags for generating html elements
HTML_TAGS = {
    "text": "<div class='form-group copo-form-group'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
            "<input class='input-copo form-control' type='text' id='{elem_id!s}' name='{elem_id!s}' value='{elem_value!s}'>"
            "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "textarea": "<div class='form-group copo-form-group'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
                "<textarea class='form-control' rows='6' cols='40' id='{elem_id!s}' name='{elem_id!s}'>{elem_value!s}</textarea>"
                "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "select": "<div class='form-group copo-form-group {elem_class!s}'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
              "<select class='form-control input-copo' id='{elem_id!s}' name='{elem_id!s}'> {option_values!s} </select>"
              "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "date": "<div class='form-group copo-form-group'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
            "<input type='text' class='pop_date_picker input-copo' id='{elem_id!s}' name='{elem_id!s}' "
            "value='{elem_value!s}'><span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "hidden": "<input type='hidden' id='{elem_id!s}' name='{elem_id!s}' value='{elem_value!s}'>",

    "file": "",

    "ontology term": "<div class='form-group copo-form-group'><label for='{elem_id!s}.annotationValue'>{elem_label!s}</label><br/>"
                     "<span class='ontology_span'><input autocomplete='off' data-autocomplete='{ols_url}' "
                     "class='input-copo ontology-field' type='text' id='{elem_id!s}.annotationValue' value='{annotationValue!s}' "
                     "name='{elem_id!s}.annotationValue' />"
                     "<input type='hidden' id='{elem_id!s}.termSource' name='{elem_id!s}.termSource' value='{termSource!s}'>"
                     "<input type='hidden' id='{elem_id!s}.termAccession' name='{elem_id!s}.termAccession' value='{termAccession!s}'></span>"
                     "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "copo-multi-select": "<div class='form-group copo-form-group'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
                         "<select class='input-copo copo-multi-select' multiple "
                         "placeholder='Select options...'> {option_values!s} </select>"
                         "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span>"
                         "<input type='hidden' class='copo-multi-values' id='{elem_id!s}' name='{elem_id!s}' "
                         "value='{elem_value!s}'></div>",

    "copo-multi-search": "<div class='form-group copo-form-group'><label for='{elem_id!s}'>{elem_label!s}</label><br/>"
                         "<select id='{elem_id!s}_copo-multi-search' "
                         "class='input-copo copo-multi-search' placeholder='Select options...' "
                         "multiple='multiple'></select>"
                         "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span>"
                         "<input type='hidden' data-control='copo-multi-search' "
                         "class='copo-multi-values' id='{elem_id!s}' name='{elem_id!s}'> "
                         "<input type='hidden' class='elem-json' value='{elem_json!s}'></div>",

    "copo-select": "<div style='padding-bottom:1px;' class='form-group copo-form-group'>"
                   "<label for='{elem_id!s}'>{elem_label!s}</label><br/>"
                   "<input class='copo-select input-copo' type='text' id='{elem_id!s}' "
                   "name='{elem_id!s}' value='{elem_value!s}'>"
                   "<span class='form-input-help' style='display: none'>{elem_help_tip!s}</span></div>",

    "oauth_required": '<a href="/rest/forward_to_figshare/"> Grant COPO access to your Figshare account </a>',

    "characteristic/factor":
        '<div class="sample_attributes_div" style="border: 1px solid #">'

        '<div style="display: inline-block;">'
        '<input type="text" name="category_annotationValue_{elem_id!s}_{div_id!s}" data-field_type="{copo_module!s}_{field_type!s}" id="category_annotationValue_{elem_id!s}_{div_id!s}"'
        ' class="input-copo"'
        ' value="{annotationValue!s}" placeholder="{elem_label!s}"/>'
        '<datalist id="list_{elem_id!s}_{div_id!s}"></list>'
        '<input type="hidden" name="category_termAccession_{elem_id!s}_{div_id!s}"'
        ' id="category_termAccession_{elem_id!s}_{div_id!s}" value="{termAccession!s}"/>'
        '<input type="hidden" name="category_termSource_{elem_id!s}_{div_id!s}"'
        ' id="category_termSource_{elem_id!s}_{div_id!s}" value="{termSource!s}"/>'
        '</div>'

        '<div style="display: inline-block;">'
        '<input type="text" value="{value!s}" name="value_annotationValue_{elem_id!s}_{div_id!s}" data-field_type="{copo_module!s}_{field_type!s}" id="value_annotationValue_{elem_id!s}_{div_id!s}" class="input-copo" placeholder="value"/>'
        '</div>'

        '<div style="display: inline-block;">'
        '<span class="ontology_span">'
        '<input type="text" value="{unit!s}" list="list_{elem_id!s}_{div_id!s}"  autocomplete="off" data-autocomplete="{ols_url}" name="unit_annotationValue_{elem_id!s}_{div_id!s}" data-field_type="{copo_module!s}_{field_type!s}" id="unit_annotationValue_{elem_id!s}_{div_id!s}"'
        ' class="input-copo ontology-field" placeholder="unit" value="{unit!s}" />'
        '</span>'
        '<datalist id="list_{elem_id!s}_{div_id!s}"></list>'
        '</div>'

        '<input type="hidden" name="termAccessionNumber_{elem_id!s}_{div_id!s}"'
        ' id="termAccessionNumber_{elem_id!s}_{div_id!s}" value="{termAccession!s}"/>'

        '<input type="hidden" name="termSourceREF_{elem_id!s}_{div_id!s}"'
        ' id="termSourceREF_{elem_id!s}_{div_id!s}" value="{termSource!s}"/>'

        '<div style="display: inline-block;">'
        '<a id="sample_attribute_remove_{div_id!s}"'
        ' name="sample_attribute_remove_{div_id!s}"'
        ' class="btn btn-xs btn-danger sample-attribute-remove" href="#">'
        '<i class="fa fa-trash-o fa-sm"></i> Delete</a>'
        '</div></div>'

        '<button class="btn btn-xs btn-success char_factor ">'
        '<i class="fa fa-plus-circle"></i>'
        'New</button>',

    "bootstrap_button": '<button type="button" id="{btn_id!s}" class="btn btn-{btn_type!s}">{btn_text!s}</button>',
    "bootstrap_button_right": '<button type="button" id="{btn_id!s}" class="btn btn-{btn_type!s} pull-right">{btn_text!s}</button>',
    "bootstrap_button_small": '<button type="button" id="{btn_id!s}" class="btn btn-{btn_type!s} btn-sm">{btn_text!s}</button>',
    "bootstrap_button_small_right": '<button type="button" id="{btn_id!s}" class="btn btn-{btn_type!s} btn-sm pull-right">{btn_text!s}</button>',

    "action_buttons": ''

}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# for displaying information/guidance mostly via tooltips
UI_INFO = {
    'study_type_add_info': "Use this form to add new study types",
    'study_type_clone_info': "Use this form to clone existing study types",
    'sample_add_info': "Use this form to add/edit study sample and assign to studies",
    'sample_assign_info': "View allows for assigning samples to current study",
    'sample_unassign_warning': 'Assigned samples about to be deleted!.',
    'add_form_title': "<h4 class='modal-title'>Add New <span style='text-transform: capitalize;'>{component_name!s}</span></h4>",
    'edit_form_title': "<h4 class='modal-title'>Edit <span style='text-transform: capitalize;'>{component_name!s}</span></h4>",
    'publication_doi_resolution': 'Enter a DOI or PubMed ID to be resolved',
    'user_defined_attribute_message': "This will be treated as a user-defined attribute",
    'files_add_info': 'Use this dialog to specify the specific details of the file you just uploaded',
    'system_suggested_attribute_message': "This is a system-suggested attribute",
    'component_delete_body': "<p>You are about to delete the highlighted {component_name!s} record.</p> <p>Do you want to proceed?</p>",
    'component_delete_title': "<h4 class='modal-title'>Confirm Delete Action</h4>",
    'component_unassign_body': "<p>You are about to unassign the highlighted {component_name!s}.</p> <p>Do you want to proceed?</p>",
    'component_unassign_title': "<h4 class='modal-title'>Confirm <span style='text-transform: capitalize;'>{component_name!s}</span> Unassignment</h4>"

}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# specifies file paths holding the configs for wizard stages:
WIZARD_FILES = {
    'start': os.path.join(RESOLVER['wizards_datafile'], 'start_stages.json'),
    'ena': os.path.join(RESOLVER['wizards_datafile'], 'ena_stages.json'),
    'figshare': os.path.join(RESOLVER['wizards_datafile'], 'figshare_stages.json'),
    'miappe': os.path.join(RESOLVER['wizards_datafile'], 'miappe_stages.json'),
    'sample_start': os.path.join(RESOLVER['wizards_sample'], 'start_stages.json'),
    'sample_attributes': os.path.join(RESOLVER['wizards_sample'], 'attributes_stages.json'),
    'dcterms': os.path.join(RESOLVER['wizards_datafile'], 'dc_stages.json'),
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# strings used in creating requests to ontology services
# fieldList={fields!s}
# ontology={ontologies!s}
# size=50&r&
ONTOLOGY_LKUPS = {
    'ontologies_to_search': 'go,co,po',
    'fields_to_search': 'label,description,short_form',
    'ebi_ols_autocomplete': 'http://www.ebi.ac.uk/ols/api/select?q={term!s}&ontology={ontology_names!s}&rows=50',
    'ontology_file_uri': 'http://data.bioontology.org/ontologies/'
}

# •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••#
# path to different message configurations across the system
MESSAGES_LKUPS = {
    'HELP_MESSAGES': {
        'datafile': os.path.join(RESOLVER['lookup'], 'help_messages', 'datafile_help.json'),
        'sample': os.path.join(RESOLVER['lookup'], 'help_messages', 'sample_help.json'),
    },
    'datafile_wizard': os.path.join(RESOLVER['wizards_datafile'], 'messages', 'wizard_messages.json'),
    'sample_wizard_messages': os.path.join(RESOLVER['wizards_sample'], 'messages', 'wizard_messages.json'),
    'lookup_messages': os.path.join(RESOLVER['lookup'], 'messages.json'),
    'message_templates': os.path.join(RESOLVER['lookup'], 'message_templates.json'),
    'button_templates': os.path.join(RESOLVER['lookup'], 'button_templates.json'),
    'exception_messages': os.path.join(RESOLVER['copo_exceptions'], 'messages.json')
}

# help messages

# path to rating templates for rating description metadata
METADATA_RATING_TEMPLATE_LKUPS = {
    'rating_template': os.path.join(RESOLVER['schemas_utils'], 'metadata_rating_templates', 'rating_template_v1.json')
}

FIGSHARE_API_URLS = {
    'base_url': 'https://api.figshare.com/v2/{endpoint}',
    'access_token': 'https://figshare.com/account/applications/authorize?client_id=978ec401ab6ad6c1d66f0b6cef3015d71a4734d7&scope=all&response_type=code&redirect_url={redirect_url}/',
    'login_return': '{return_url}?figshare_oauth=true',
    'authorization_token': 'https://api.figshare.com/v2/token'
}

# THIS IS DEPRECATED!!! SEE data_utils.get_db_json_schema()
ISA_SCHEMAS = {
    'investigation_schema': '/schemas/copo/dbmodels/investigation_schema.json',
    'publication_schema': '/schemas/copo/dbmodels/publication_schema.json',
    'person_schema': '/schemas/copo/dbmodels/person_schema.json',
    'ontology_annotation_schema': '/schemas/copo/dbmodels/ontology_annotation_schema.json',
    'organization_schema': '/schemas/copo/dbmodels/organization_schema.json',
    'study_schema': '/schemas/copo/dbmodels/study_schema.json',
    'assay_schema': '/schemas/copo/dbmodels/assay_schema.json',
    'data_schema': '/schemas/copo/dbmodels/data_schema.json',
    'comment_schema': '/schemas/copo/dbmodels/comment_schema.json',
    'material_schema': '/schemas/copo/dbmodels/material_schema.json',
    'sample_schema': '/schemas/copo/dbmodels/sample_schema.json',
    'source_schema': '/schemas/copo/dbmodels/source_schema.json',
    'material_attribute_value_schema': '/schemas/copo/dbmodels/material_attribute_value_schema.json',
    'protocol_schema': '/schemas/copo/dbmodels/protocol_schema.json',
    'protocol_parameter_schema': '/schemas/copo/dbmodels/protocol_parameter_schema.json',
}
