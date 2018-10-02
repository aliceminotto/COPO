/**Created by etuka on 06/05/2016.
 * contains functions for generating form html from JSON-based tags
 */

var olsURL = ""; // url of ols lookup for ontology fields
var lookupsURL = ""; //lookup url for agrovoc labels
var copoSchemas = {};
var copoFormsURL = "/copo/copo_forms/";
var globalDataBuffer = {};
var htmlForm = $('<div/>'); //global form div
var formMode = "add";
var componentData = null;
var global_key_split = "___0___";

$(document).ready(function () {
    var csrftoken = $.cookie('csrftoken');

    //get urls
    olsURL = $("#elastic_search_ajax").val();
    lookupsURL = $("#ajax_search_copo_local").val();

    //retrieve and set form resources
    $.ajax({
        url: copoFormsURL,
        type: "POST",
        headers: {'X-CSRFToken': csrftoken},
        data: {
            'task': 'resources'
        },
        success: function (data) {
            copoSchemas = data.copo_schemas;
        },
        error: function () {
            alert("Couldn't retrieve form resources!");
        }
    });

    //handle event for form calls
    $(document).on("click", ".new-form-call", function (e) {//call to generate form
        e.preventDefault();

        var component = "";
        try {
            var component = $(this).attr("data-component");
        } catch (err) {
            console.log(err);
        }

        if (component == 'annotation') {
            initiate_annotation_call();
        }
        else {
            initiate_form_call(component);
        }
    });


}); //end of document ready

//map controls to rendering functions
var controlsMapping = {
    "text": "do_text_ctrl",
    "email": "do_text_ctrl",
    "text_small": "do_small_text_ctrl",
    "textarea": "do_textarea_ctrl",
    "hidden": "do_hidden_ctrl",
    "copo-select": "do_copo_select_ctrl",
    "ontology term": "do_ontology_term_ctrl",
    "copo-lookup": "do_copo_lookup_ctrl",
    "select": "do_select_ctrl",
    "copo-onto-select": "do_onto_select_ctrl",
    "copo-multi-search": "do_copo_multi_search_ctrl",
    "copo-multi-select": "do_copo_multi_select_ctrl",
    "copo-comment": "do_copo_comment_ctrl",
    "copo-characteristics": "do_copo_characteristics_ctrl_2",
    "copo-environmental-characteristics": "do_copo_characteristics_ctrl_2",
    "copo-phenotypic-characteristics": "do_copo_characteristics_ctrl_2",
    "oauth_required": "do_oauth_required",
    "copo-button-list": "do_copo_button_list_ctrl",
    "copo-item-count": "do_copo_item_count_ctrl",
    "date-picker": "do_date_picker_ctrl",
    "copo-duration": "do_copo_duration_ctrl",
    "text-percent": "do_percent_text_box",
    "copo-resolver": "do_copo_resolver_ctrl",
    "copo-input-group": "do_copo_input_group_ctrl"
};

function initiate_form_call(component) {
    var errorMsg = "Couldn't build " + component + " form!";

    $.ajax({
        url: copoFormsURL,
        type: "POST",
        headers: {'X-CSRFToken': csrftoken},
        data: {
            'task': 'form',
            'component': component
        },
        success: function (data) {
            json2HtmlForm(data);
            componentData = data;

        },
        error: function () {
            alert(errorMsg);
        }
    });
}

function initiate_annotation_call() {
    $('#processing_div').hide()
    $('#file_picker_modal').modal('show')
    $("#form_submit_btn").on('click', function () {
        var formData = new FormData();
        formData.append('file', $('#InputFile')[0].files[0]);
        formData.append('file_type', $('#file_type_dropdown').val())
        formData.append('skip_rows', $('#row_skip_dd').val())
        var csrftoken = $.cookie('csrftoken');
        var url = "/api/upload_annotation_file/"
        $.ajax({
            url: url,
            type: "POST",
            headers: {'X-CSRFToken': csrftoken},
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'json'
        }).done(function (e) {
            // add mongo id to document data
            $(document).data('annotation_id', e._id.$oid)
            $('#annotation_table_wrapper').hide()
            $('#annotation_content').show()

            if (e.type == 'PDF Document') {
                $(document).data('annotator_type', 'txt')
                load_txt_data(e);
            }
            else if (e.type == 'Spreadsheet') {
                $(document).data('annotator_type', 'ss')
                load_ss_data(e);
            }

            setup_annotator()
            $('#file_picker_modal').modal('hide');
        });
    });
}

function json2HtmlForm(data) {

    //tidy up before closing the modal
    var doTidyClose = {
        closeIt: function (dialogRef) {
            refresh_tool_tips();

            htmlForm.empty(); //clear form
            dialogRef.close();
        }
    };

    var dialog = new BootstrapDialog({
        type: BootstrapDialog.TYPE_PRIMARY,
        size: BootstrapDialog.SIZE_NORMAL,
        title: function () {
            return $('<span>' + get_form_title(data) + '</span>');
        },
        closable: false,
        animate: true,
        draggable: true,
        onhide: function (dialogRef) {
            refresh_tool_tips();
        },
        onshown: function (dialogRef) {

            //prevent enter keypress from submitting form automatically
            $("form").keypress(function (e) {
                //Enter key
                if (e.which == 13) {
                    return false;
                }
            });

            //custom validators
            custom_validate(htmlForm.find("form"));

            refresh_form_aux_controls();

            var event = jQuery.Event("postformload"); //individual compnents can trap and handle this event as they so wish
            $('body').trigger(event);


            //validate on submit event
            htmlForm.find("form").validator().on('submit', function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                } else {
                    e.preventDefault();

                    save_form(data.form);
                    refresh_tool_tips();
                    dialogRef.close();
                }
            });


        },
        buttons: [
            {
                label: 'Cancel',
                cssClass: 'tiny ui basic button',
                action: function (dialogRef) {
                    doTidyClose["closeIt"](dialogRef);
                }
            },
            {
                label: '<i class="copo-components-icons glyphicon glyphicon-save"></i> Save',
                cssClass: 'tiny ui basic primary button',
                action: function (dialogRef) {
                    validate_forms(htmlForm.find("form"));
                }
            }
        ]
    });

    var $dialogContent = $('<div/>');

    var form_help_div = set_up_form_help_div(data);
    var form_message_div = get_form_message(data);

    var form_body_div = set_up_form_body_div(data);

    $dialogContent.append(form_help_div).append(form_message_div).append(form_body_div);
    dialog.realize();
    dialog.setMessage($dialogContent);
    dialog.open();


} //end of json2HTMLForm

function build_form_body(data) {
    var formJSON = data.form;
    var formValue = formJSON.form_value;

    //clean slate for form
    var formCtrl = htmlForm.find("form");
    if (formCtrl.length) {
        formCtrl.empty();
    } else {
        formCtrl = $('<form/>',
            {
                "data-toggle": "validator"
            });
    }

    //generate controls given component schema
    for (var i = 0; i < formJSON.form_schema.length; ++i) {

        var formElem = formJSON.form_schema[i];
        var control = formElem.control

        var elemValue = null;

        if (formValue) {
            var elem = formElem.id.split(".").slice(-1)[0];
            if (formValue[elem]) {
                elemValue = formValue[elem];
            }
        } else {
            if (formElem.default_value) {
                elemValue = formElem.default_value;
            } else {
                elemValue = "";
            }
        }

        if (formElem.hidden == "true") {
            control = "hidden";
        }

        try {
            formCtrl.append(dispatchFormControl[controlsMapping[control.toLowerCase()]](formElem, elemValue));
        }
        catch (err) {
            console.log(err);
            formCtrl.append('<div class="form-group copo-form-group"><span class="text-danger">Form Control Error</span> (' + formElem.label + '): Cannot resolve form control!</div>');
        }
    }

    return htmlForm.append(formCtrl);

}

function generate_form_controls(formSchema, formValue) {
    var layoutDiv = $('<div/>');

    for (var i = 0; i < formSchema.length; ++i) {

        var FormElem = formSchema[i];

        var control = FormElem.control;
        var elemValue = null;

        if (formValue) {
            var elem = FormElem.id.split(".").slice(-1)[0];
            if (formValue[elem]) {
                elemValue = formValue[elem];
            }
        } else {
            if (FormElem.default_value) {
                elemValue = FormElem.default_value;
            } else {
                elemValue = "";
            }
        }

        if (FormElem.hidden == "true") {
            control = "hidden";
        }

        try {
            layoutDiv.append(dispatchFormControl[controlsMapping[control.toLowerCase()]](FormElem, elemValue));
        }
        catch (err) {
            console.log(err);
            layoutDiv.append('<div class="form-group copo-form-group"><span class="text-danger">Form Control Error</span> (' + FormElem.label + '): Cannot resolve form control!</div>');
        }
    }

    return layoutDiv
}


function get_form_message(data) {
    var messageDiv = $('<div/>',
        {
            style: "display:none;"
        });

    var message_text = null;
    var message_type = null;


    try {
        message_text = data.form.form_message.text;
        message_type = data.form.form_message.type;

    } catch (err) {
    }

    if (message_text && message_type) {
        messageDiv = $('<div/>',
            {
                html: '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><i class="' + data.form.form_message.icon_class + '" style="margin-right: 5px;"></i>' + data.form.form_message.text,
                class: "alert alert-" + data.form.form_message.type
            });
    }

    return $('<div/>',
        {
            class: "row"
        }).append($('<div/>',
        {
            class: "col-sm-12 col-md-12 col-lg-12"
        }).append(messageDiv));
}

function get_form_title(data) {
    var formTitle = "";

    if (data.form.target_id) {
        formTitle = "Edit " + data.form.form_label;
        formMode = "edit";
    } else {
        formTitle = "Add " + data.form.form_label;
        formMode = "add";
    }

    return formTitle;
}

function get_help_ctrl() {
    var helpCtrl = $('<div/>',
        {
            html: '<span style="padding:6px;">Help tips</span><input class="copo-help-chk" type="checkbox" name="helptips-chk">',
            class: "tips-switch-form-div form-group pull-right"
        });

    return helpCtrl;
}

function set_up_help_ctrl(ctrlName) {

    // now set up switch button to support the tool tips
    $("[name='" + ctrlName + "']").bootstrapSwitch(
        {
            size: "mini",
            onColor: "primary",
            state: true
        });

    $('input[name="' + ctrlName + '"]').on('switchChange.bootstrapSwitch', function (event, state) {
        if ($(this).closest(".helpDivRow").siblings(".formDivRow").length) {
            toggle_display_help_tips(state, $(this).closest(".helpDivRow").siblings(".formDivRow").first());
        }
    });

}

function set_up_form_help_div(data) {
    var ctrlDiv = $('<div/>',
        {
            class: "row helpDivRow",
            style: "margin-bottom:20px;"
        });

    var cloneCol = $('<div/>',
        {
            class: "col-sm-7 col-md-7 col-lg-7"
        });

    var helpCtrl = $('<div/>',
        {
            class: "col-sm-5 col-md-5 col-lg-5"
        }).append(get_help_ctrl());

    return ctrlDiv.append(cloneCol).append(helpCtrl);
}

function set_up_form_body_div(data) {
    var formBodyDiv = $('<div/>',
        {
            class: "row formDivRow"
        }).append($('<div/>',
        {
            class: "col-sm-12 col-md-12 col-lg-12"
        }).append(htmlForm));

    //build main form
    build_form_body(data);

    return formBodyDiv;
}

function build_clone_control(component_records, component_label) {
    var ctrlsDiv = $('<div/>',
        {
            style: "padding:1px; margin-bottom:-15px;"
        });

    //build hidden fields to hold selected options, and supply control data
    var hiddenValuesCtrl = $('<input/>',
        {
            type: "hidden",
            class: "copo-multi-values copo-clone-control",
            "data-maxItems": 1, //makes this a single select box instead of the default multiple
        });

    //build select
    var selectCtrl = $('<select/>',
        {
            class: "input-copo copo-multi-select",
            placeholder: "Clone a " + component_label + " record..."
        });

    $('<option value=""></option>').appendTo(selectCtrl);

    for (var i = 0; i < component_records.length; ++i) {
        var option = component_records[i];
        $('<option value="' + option.value + '">' + option.label + '</option>').appendTo(selectCtrl);
    }

    ctrlsDiv.append(selectCtrl).append(hiddenValuesCtrl);

    return form_div_ctrl().append(ctrlsDiv);
}


function refresh_form_aux_controls() {
    //refresh controls
    refresh_tool_tips();

    //set up help tips
    set_up_help_ctrl("helptips-chk");

    //refresh form validator
    refresh_validator(htmlForm.find("form"));
}

function set_validation_markers(formElem, ctrl) {
    //validation markers

    var validationMarkers = {};
    var errorHelpDiv = "";

    //required marker
    if (formElem.hasOwnProperty("required") && (formElem.required.toString().toLowerCase() == "true")) {
        ctrl.attr("required", true);
        ctrl.attr("data-error", formElem.label + " required!");

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    //unique marker...
    if (formElem.hasOwnProperty("unique") && (formElem.unique.toString().toLowerCase() == "true")) {
        var uniqueArray = [];

        if (formElem.hasOwnProperty("unique_items")) {
            uniqueArray = formElem.unique_items;
        }

        uniqueArray = JSON.stringify(uniqueArray);

        ctrl.attr("data-unique", "unique");
        ctrl.attr("data-unique-array", uniqueArray);
        ctrl.attr('data-unique-error', "The " + formElem.label + " value already exists!");

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }


    //batch unique marker...allows unique test for siblings of the same kind on the form
    if (formElem.hasOwnProperty("batch") && (formElem.batch.toString().toLowerCase() == "true")) {
        ctrl.attr("data-batch", "batch");
        ctrl.attr("data-family-name", formElem.batchuniquename);
        ctrl.attr('data-batch-error', "The " + formElem.label + " value has already been assigned!");

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    //email marker...
    if (formElem.hasOwnProperty("email") && (formElem.email.toString().toLowerCase() == "true")) {
        ctrl.attr("data-email", "email");
        ctrl.attr('data-email-error', "Please enter a valid value for the " + formElem.label);

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    //phone marker...
    if (formElem.hasOwnProperty("phone") && (formElem.phone.toString().toLowerCase() == "true")) {
        ctrl.attr("data-phone", "phone");
        ctrl.attr('data-phone-error', "Please enter a valid value for the " + formElem.label);

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    //resolver marker...
    if (formElem.hasOwnProperty("igroup") && (formElem.igroup.toString().toLowerCase() == "true")) {
        ctrl.attr("data-igroup", "igroup");
        ctrl.attr('data-igroup-error', "Please click " + formElem.button_label);

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    //characteristic marker
    if (formElem.hasOwnProperty("characteristics") && (formElem.characteristics.toString().toLowerCase() == "true")) {
        ctrl.attr("data-characteristics", "characteristics");
        ctrl.attr('data-characteristics-error', "Value/Unit error!");

        errorHelpDiv = $('<div></div>').attr({class: "help-block with-errors"});
    }

    validationMarkers['errorHelpDiv'] = errorHelpDiv;
    validationMarkers['ctrl'] = ctrl;

    return validationMarkers;
}

//form controls
var dispatchFormControl = {

    do_percent_text_box: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV input-group"
            });
        var span = $('<span/>',
            {
                class: "input-group-addon"
            })
        $(span).html('%')
        var input = $('<input/>',
            {
                type: "text",
                class: "input-copo form-control",
                id: formElem.id,
                name: formElem.id,

            })
        ctrlsDiv.append(input)
        ctrlsDiv.append(span)
        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_date_picker_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var txt = $('<input/>',
            {
                type: "text",
                class: "input-copo form-control date-picker",
                id: formElem.id,
                name: formElem.id
            });

        //set validation markers
        var vM = set_validation_markers(formElem, txt);

        ctrlsDiv.append(txt);
        ctrlsDiv.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_text_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var metaDiv = $('<div/>');
        var readonly = false;

        if (formElem.readonly) {
            readonly = formElem.readonly;
        }

        if (formElem.control == 'email') {
            formElem.email = true;
        }

        var txt = $('<input/>',
            {
                type: "text",
                class: "input-copo form-control copo-text-control",
                id: formElem.id,
                name: formElem.id,
                readonly: readonly
            });

        //set validation markers
        var vM = set_validation_markers(formElem, txt);

        metaDiv.append(txt);


        // set control metadata
        if (formElem.hasOwnProperty("control_meta")) {
            var control_meta = formElem.control_meta;

            if (control_meta.hasOwnProperty("input_group_addon")) {
                //get addon label
                var input_group_addon_label = '';

                try {
                    var input_group_addon_label = control_meta.input_group_addon_label;
                } catch (err) {
                    ;
                }

                //redefine metaDiv
                metaDiv = $('<div/>',
                    {
                        class: "input-group"
                    });

                var inputGroupSpan = $('<span/>',
                    {
                        class: "input-group-addon",
                        html: input_group_addon_label
                    });

                if (control_meta.input_group_addon == "right") {
                    metaDiv.append(txt).append(inputGroupSpan);
                } else {
                    metaDiv.append(inputGroupSpan).append(txt);
                }
            }

        }

        ctrlsDiv.append(metaDiv);
        ctrlsDiv.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_small_text_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var txt = $('<input/>',
            {
                type: "text",
                class: "input-copo form-control width100",
                id: formElem.id,
                name: formElem.id,
            });

        //set validation markers
        var vM = set_validation_markers(formElem, txt);

        ctrlsDiv.append(txt);
        ctrlsDiv.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_textarea_ctrl: function (formElem, elemValue) {

        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var txt = $('<textarea/>',
            {
                class: "form-control copo-textarea-control",
                rows: 4,
                cols: 40,
                id: formElem.id,
                name: formElem.id
            });

        //set validation markers
        var vM = set_validation_markers(formElem, txt);

        ctrlsDiv.append(txt);
        ctrlsDiv.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_select_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        //build select
        var selectCtrl = $('<select/>',
            {
                class: "form-control input-copo copo-select-control",
                id: formElem.id,
                name: formElem.id
            });

        if (formElem.option_values) {
            for (var i = 0; i < formElem.option_values.length; ++i) {
                var option = formElem.option_values[i];
                var lbl = "";
                var vl = "";
                if (typeof option === "string") {
                    lbl = option;
                    vl = option;
                } else if (typeof option === "object") {
                    lbl = option.label;
                    vl = option.value;
                }
                if (vl == "required") {
                    $('<option disabled selected value>' + lbl + '</option>').appendTo(selectCtrl)
                }
                else {
                    $('<option value="' + vl + '">' + lbl + '</option>').appendTo(selectCtrl);
                }
            }
        }

        ctrlsDiv.append(selectCtrl);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_onto_select_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        //build select
        var selectCtrl = $('<select/>',
            {
                class: "form-control input-copo onto-select",
                id: formElem.id,
                name: formElem.id,
                placeholder: formElem.label
            });

        ctrlsDiv.append(selectCtrl);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_copo_duration_ctrl: function (formElem, elemValue) {

        var durationSchema = copoSchemas[formElem.control.toLowerCase()];

        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        for (var i = 0; i < durationSchema.length; ++i) {
            var mg = "margin-left:5px;";
            if (i == 0) {
                mg = '';
            }
            var fv = formElem.id + "." + durationSchema[i].id.split(".").slice(-1)[0];


            var sp = $('<span/>',
                {
                    style: "display: inline-block; " + mg
                });

            var durationCtrlObject = get_basic_input(sp, durationSchema[i]);


            durationCtrlObject.find(":input").each(function () {
                //toni's comment
                // if (this.id) {
                //     this.id = fv + "." + this.id;
                // }

                //end toni's comment

                if (this.id) {
                    this.id = fv;
                }

                //set placeholder text
                if ($(this).hasClass("ontology-field")) {
                    $(this).attr("placeholder", durationSchema[i].label.toLowerCase());
                }
            });

            ctrlsDiv.append(durationCtrlObject);
        }

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_copo_characteristics_ctrl_2: function (formElem, elemValue) {
        var workingSchema = copoSchemas[formElem.control.toLowerCase()];

        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV form-inline row"
            });

        for (var i = 0; i < workingSchema.length; ++i) {
            var fv = formElem.id + "." + workingSchema[i].id.split(".").slice(-1)[0];

            if (workingSchema[i].hidden == "false") {

                var sp = $('<div/>',
                    {
                        class: "form-group col-sm-4 col-md-4 col-lg-4"
                    });

                //get ontology ctrl
                var ontologyCtrlObject = get_ontology_span_2(sp, workingSchema[i]);

                ontologyCtrlObject.find(":input").each(function () {
                    if (this.id) {
                        this.id = fv + "." + this.id;
                        this.name = this.id;
                        $(this).attr("data-parent1", workingSchema[i].id.split(".").slice(-1)[0]);
                    }
                });

                //set placeholder text
                ontologyCtrlObject.find(".onto-select").attr("placeholder", workingSchema[i].label);

                //check for validation parameters
                if (workingSchema[i].hasOwnProperty("validation_target") && (workingSchema[i].validation_target.toString() == "true")) {
                    ontologyCtrlObject.find(".onto-select").addClass("copo-validation-target");
                }

                if (workingSchema[i].hasOwnProperty("validation_source") && (workingSchema[i].validation_source.toString() == "true")) {
                    ontologyCtrlObject.find(".onto-select").addClass("copo-validation-source");
                }

                ctrlsDiv.append(ontologyCtrlObject);

                //set validation markers
                if (ontologyCtrlObject.find(".copo-validation-source").length || ontologyCtrlObject.find(".copo-validation-target").length) {
                    var validationObject = ontologyCtrlObject.find(".onto-select");
                    var formElemAdHoc = {}; //ad-hoc form element
                    formElemAdHoc["characteristics"] = "true";
                    var vM = set_validation_markers(formElemAdHoc, validationObject);
                    ontologyCtrlObject.append(vM.errorHelpDiv);
                }

            } else {
                ctrlsDiv.append($('<input/>',
                    {
                        type: "hidden",
                        id: fv,
                        name: fv
                    }));
            }
        }

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_copo_comment_ctrl: function (formElem, elemValue) {
        var commentSchema = copoSchemas[formElem.control.toLowerCase()];

        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV form-inline row"
            });

        for (var i = 0; i < commentSchema.length; ++i) {
            var fv = commentSchema[i].id.split(".").slice(-1)[0];

            if (commentSchema[i].hidden == "false") {
                var sp = $('<div/>',
                    {
                        class: "form-group col-sm-6 col-md-6 col-lg-6"
                    });

                if (formElem.hasOwnProperty("_displayOnlyThis") && (fv != formElem["_displayOnlyThis"])) {
                    //note: _displayOnlyThis is a mechanism for hiding some parts of a composite
                    //control that would have ordinarily been displayed on the UI. Its use does not in any way
                    // replace, or serve the purpose of, the html 'hidden' property defined on 'formElem'

                    sp.attr({
                        style: "display: none; "
                    });
                }


                var txt = $('<textarea/>',
                    {
                        class: "form-control copo-comment-control",
                        rows: 2,
                        style: "min-width: 100%;",
                        placeholder: commentSchema[i].label,
                        id: formElem.id + '.' + fv,
                        name: formElem.id + '.' + fv
                    });

                sp.append(txt);
                ctrlsDiv.append(sp);

            } else {
                ctrlsDiv.append($('<input/>',
                    {
                        type: "hidden",
                        id: formElem.id + "." + fv,
                        name: formElem.id + "." + fv,
                    }));
            }
        }

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_ontology_term_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        //get ontology ctrl
        var ontologyCtrlObject = get_ontology_span_2($('<span/>'), formElem);

        ontologyCtrlObject.find(":input").each(function () {
            if (this.id) {
                var tempID = this.id;
                this.id = formElem.id + "." + tempID;
                this.name = formElem.id + "." + tempID;
            }
        });

        ctrlsDiv.append(ontologyCtrlObject);

        var vM = set_validation_markers(formElem, ontologyCtrlObject.find(".onto-select"));
        ontologyCtrlObject.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_copo_lookup_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        ctrlsDiv = get_lookup_span(ctrlsDiv, formElem);

        var returnDiv = get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);

        return returnDiv;
    },
    do_copo_multi_select_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        //build hidden fields to hold selected options, and supply control data

        var data_maxItems = 'null';
        if (formElem.data_maxItems) {
            data_maxItems = formElem.data_maxItems;
        }

        var hiddenValuesCtrl = $('<input/>',
            {
                type: "hidden",
                id: formElem.id,
                name: formElem.id,
                class: "copo-multi-values",
                "data-maxItems": data_maxItems, //sets the maximum selectable elements, default is 'null'
            });

        //build select
        var selectCtrl = $('<select/>',
            {
                class: "input-copo copo-multi-select",
                placeholder: "Select " + formElem.label + "...",
                multiple: "multiple",
                "data-validate": true,
            });

        if (formElem.option_values) {
            for (var i = 0; i < formElem.option_values.length; ++i) {
                var option = formElem.option_values[i];
                var lbl = "";
                var vl = "";
                if (typeof option === "string") {
                    lbl = option;
                    vl = option;
                } else if (typeof option === "object") {
                    lbl = option.label;
                    vl = option.value;
                }

                $('<option value="' + vl + '">' + lbl + '</option>').appendTo(selectCtrl);
            }
        }

        ctrlsDiv.append(selectCtrl).append(hiddenValuesCtrl);

        //set validation markers
        var vM = set_validation_markers(formElem, selectCtrl);
        ctrlsDiv.append(vM.errorHelpDiv);

        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_copo_multi_search_ctrl: function (formElem, elemValue) {
        formElem["type"] = "string"; //this, for the purposes of the UI, should be assigned a string temporarily, since multi_search takes care of the multiple values

        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        ctrlsDiv = get_multi_search_span(formElem, ctrlsDiv);

        var returnDiv = get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);

        //if required, attach create button that will enable elements of this kind to be created and assigned
        if (formElem.hasOwnProperty("show_create_button") && (formElem.show_create_button.toString() == "true")) {
            var addBtn = $('<button/>',
                {
                    style: "border-radius:0;",
                    type: "button",
                    class: "btn btn-sm btn-primary copo-component-control",
                    "data-component": formElem.option_component,
                    "data-element-id": formElem.id,
                    html: '<i class="fa fa-plus-circle"></i> Create & Assign ' + formElem.label,
                    click: function (event) {
                        event.preventDefault();
                        create_attachable_component(formElem);
                    },
                });

            var addbtnDiv = $('<div/>',
                {
                    class: "col-sm-12 col-md-12 col-lg-12"
                }).append(addBtn);

            var addbtnDivRow = $('<div/>',
                {
                    class: "row btn-row",
                }).append(addbtnDiv);

            returnDiv.append(addbtnDivRow);
        }

        return returnDiv;
    },
    do_copo_select_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        //generate element controls
        var txt = $('<input/>',
            {
                type: "text",
                class: "copo-select input-copo",
                id: formElem.id,
                name: formElem.id,
                "data-validate": true,
            });

        //set validation markers
        var vM = set_validation_markers(formElem, txt);

        ctrlsDiv.append(txt);
        ctrlsDiv.append(vM.errorHelpDiv);


        return get_form_ctrl(ctrlsDiv.clone(), formElem, elemValue);
    },
    do_hidden_ctrl: function (formElem, elemValue) {

        var hiddenCtrl = $('<input/>',
            {
                type: "hidden",
                id: formElem.id,
                name: formElem.id,
                value: elemValue
            });

        return hiddenCtrl;

    },
    do_oauth_required: function () {
        return $('<a/>', {
            href: "/rest/forward_to_figshare/",
            html: "Grant COPO access to your Figshare account"
        });
    },
    do_copo_button_list_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var radioGroup = $('<div/>',
            {
                class: "ui grid",
            });

        var hiddenCtrl = $('<input/>',
            {
                type: "hidden",
                name: formElem.id,
                id: formElem.id
            });

        //holds previous value for this control before any change occurs
        var hiddenCtrlPreviousValue = $('<input/>',
            {
                type: "hidden",
                name: formElem.id + "_previousValue",
                id: formElem.id + "_previousValue"
            });

        var columnClass = "six"; //defines how wide the options will be
        if (formElem.option_values.length > 3) {
            columnClass = "five";
        }


        for (var i = 0; i < formElem.option_values.length; ++i) {
            var option = formElem.option_values[i];
            var description = '';
            var descriptionDiv = '';
            if (option.hasOwnProperty('description')) {
                description = option.description;

                descriptionDiv = $('<div/>',
                    {
                        style: "padding: 5px; border-left: 6px solid #D4E4ED; color:#4d4d4d; margin-bottom:4px; line-height:1.7;",
                        class: "copo-radio-description",
                        html: description
                    });
            }

            var radioCtrl = $('<input/>',
                {
                    type: "radio",
                    class: "copo-radio-option",
                    name: formElem.id + "_input",
                    value: option.value,
                    "data-lbl": option.label,
                    "data-desc": description,
                    "data-value": option.value,
                    change: function (evt) {
                        if ($(this).is(':checked')) {
                            hiddenCtrlPreviousValue.val(hiddenCtrl.val());
                            hiddenCtrl.val($(this).val())
                                .trigger('change');
                        }
                    }
                });

            if (option.value == elemValue) {
                radioCtrl.attr('checked', true);
                hiddenCtrl.val(elemValue);
            }

            var radioCtrlTxt = $('<span/>',
                {
                    style: "padding-left:5px;",
                    html: option.label,
                });

            var radioCtrlLabel = $('<label/>', {
                style: "font-weight: normal; cursor:pointer;",
            }).append(radioCtrl).append(radioCtrlTxt);


            var radioCtrlDiv = $('<div/>',
                {
                    style: "position: relative; display: block; margin-top: 10px; margin-bottom: 5px;",
                    class: "radioCtrlDiv " + columnClass + " wide column"

                })
                .append(radioCtrlLabel)
                .append(descriptionDiv);

            radioGroup.append(radioCtrlDiv);
        }

        ctrlsDiv.append(form_label_ctrl(formElem)).append(radioGroup).append(hiddenCtrl).append(hiddenCtrlPreviousValue);

        return form_div_ctrl()
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv);
    },
    do_copo_resolver_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>');

        var inputGroupDiv = $('<div/>',
            {
                class: "input-group",
            });

        ctrlsDiv.append(inputGroupDiv);

        //create input box for resolver data entry
        var resolverDataInput = $('<input/>',
            {
                type: "text",
                id: formElem.id,
                name: formElem.id,
                value: elemValue,
                placeholder: "Enter " + formElem.label + "...",
                class: "form-control resolver-data",
                "data-resolve-uri": formElem.resolver_uri,
                "data-resolve-component": formElem.resolver_component,
                blur: function (event) {
                    event.preventDefault();
                    $(this).closest(".copo-form-group").find(".help-block").html("");
                }
            });

        inputGroupDiv.append(resolverDataInput);

        //create inputgroupbtnspan
        var inputSpan = $('<span/>',
            {
                class: "input-group-btn",
            });

        inputGroupDiv.append(inputSpan);

        //create resolver-submit button
        var resolverSubmitBtn = $('<button/>',
            {
                type: "button",
                class: "btn btn-primary resolver-submit",
                html: "Resolve!"
            });

        inputSpan.append(resolverSubmitBtn);


        //create help-block div
        var helpDiv = $('<div/>',
            {
                class: "help-block",
            });

        ctrlsDiv.append(helpDiv);

        var feedBackElem = $('<div/>',
            {
                class: "webpop-content-div feedback-element",
                style: "max-height: 150px; overflow-y:auto; background: #ccc;"
            });

        ctrlsDiv.append(feedBackElem);

        return form_div_ctrl()
            .append(form_label_ctrl(formElem))
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv);

    },
    do_copo_input_group_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>');

        var inputGroupDiv = $('<div/>',
            {
                class: "input-group",
            });

        ctrlsDiv.append(inputGroupDiv);

        //create input box for data entry
        var textDataInput = $('<input/>',
            {
                type: "text",
                id: formElem.id,
                name: formElem.id,
                value: elemValue,
                placeholder: "Enter " + formElem.label + "...",
                class: "form-control copo-input-data"
            });

        inputGroupDiv.append(textDataInput);

        //create inputgroupbtnspan
        var inputSpan = $('<span/>',
            {
                class: "input-group-btn",
            });

        inputGroupDiv.append(inputSpan);

        //create resolver-submit button
        var resolverSubmitBtn = $('<button/>',
            {
                type: "button",
                class: "btn btn-primary copo-trigger-submit",
                "data-target": formElem.id,
                html: formElem.button_label
            });

        inputSpan.append(resolverSubmitBtn);


        //create help-block div
        var helpDiv = $('<div/>',
            {
                class: "help-block",
            });

        ctrlsDiv.append(helpDiv);

        var feedBackElem = $('<div/>',
            {
                class: "webpop-content-div feedback-element"
            });

        ctrlsDiv.append(feedBackElem);

        //set validation markers
        var vM = set_validation_markers(formElem, textDataInput);
        ctrlsDiv.append(vM.errorHelpDiv);

        return form_div_ctrl()
            .append(form_label_ctrl(formElem))
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv);

    },
    do_copo_button_list_ctrl_old: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>');

        var hiddenCtrl = $('<input/>',
            {
                type: "hidden",
                id: formElem.id,
                name: formElem.id,
                value: elemValue
            });

        ctrlsDiv.append(hiddenCtrl);

        var listGroup = $('<div/>',
            {
                class: "list-group"
            });

        ctrlsDiv.append(form_label_ctrl(formElem)).append(listGroup);

        for (var i = 0; i < formElem.option_values.length; ++i) {
            var option = formElem.option_values[i];

            var listGroupTitleHTML = '<h4 class="list-group-item-heading">' + option.label + '</h4>';
            listGroupTitleHTML += '<p class="list-group-item-text" style="line-height: 1.7; font-size: 14px;">' + option.description + '</p>';

            var listDiv = $('<div/>',
                {
                    class: "copo-button-listDiv"
                });

            listGroup.append(listDiv);

            var optionValueElem = $('<input/>',
                {
                    type: "hidden",
                    class: "button-value-elem",
                    name: option.label + "_value",
                    value: option.value
                })

            var btnSample = $('<a/>',
                {
                    class: "list-group-item",
                    title: formElem.help_tip + " " + option.label,
                    style: "border: 1px solid #cccccc;",
                    href: "#",
                    click: function (event) {
                        event.preventDefault();
                        hiddenCtrl.val($(this).parent().find(".button-value-elem").val());

                        $(this).closest(".copo-button-listDiv").siblings('.copo-button-listDiv').removeClass("copo-list-type-selected well well-sm");
                        $(this).closest(".copo-button-listDiv").addClass("copo-list-type-selected well well-sm").css("margin-bottom", "0px");
                    }
                });

            btnSample.append(listGroupTitleHTML);
            listDiv.append(btnSample).append(optionValueElem);

            if (i == 0) {//remember to set this back to 0, for the first element to be selected by default
                hiddenCtrl.val(option.value);
                btnSample.closest(".copo-button-listDiv").addClass("copo-list-type-selected well well-sm").css("margin-bottom", "0px");
            }

        }

        return form_div_ctrl()
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv)

    }
    ,
    do_copo_item_slider_ctrl: function (formElem, elemValue) {

        var ctrlsDiv = $('<div/>',
            {
                class: "range-slider-parent"
            });

        var countCtrl = $('<input/>',
            {
                min: "1",
                max: "100",
                step: "1",
                class: "form-control range-slider",
                "data-orientation": "horizontal",
                value: "1"
            });

        var hiddenCtrl = $('<input/>',
            {
                type: "hidden",
                class: "elem-value",
                id: formElem.id,
                name: formElem.id,
                value: "1"
            });

        var countCtrlDiv = $('<div/>',
            {
                style: "margin-top:15px;",
                title: "Slide to select " + formElem.label
            });

        countCtrlDiv.append(countCtrl);

        var countCtrlOutputDiv = $('<div/>',
            {
                style: "margin-top:20px; text-align:center;"
            });


        var countCtrlBtn = $('<button/>',
            {
                type: "button",
                style: "border-radius:0; background-image:none;",
                class: "btn btn-primary",
                html: formElem.label + ": "
            });

        countCtrlOutputDiv.append(countCtrlBtn);

        var countCtrlOutput = $('<span/>',
            {
                class: "range-slider-output",
                style: "font-size:20px;",
                html: "1"
            });

        countCtrlBtn.append(countCtrlOutput);


        ctrlsDiv.append(form_label_ctrl(formElem)).append(countCtrlDiv);
        ctrlsDiv.append(countCtrlOutputDiv);
        ctrlsDiv.append(hiddenCtrl);

        return form_div_ctrl()
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv);
    },
    do_copo_item_count_ctrl: function (formElem, elemValue) {
        var ctrlsDiv = $('<div/>',
            {
                class: "ctrlDIV"
            });

        var min = 1;
        if (formElem.hasOwnProperty("min")) {
            min = formElem.min
        }

        if (!elemValue) {
            elemValue = min;
        }

        var counter_ctrl = $('<input/>',
            {
                type: "number",
                min: min,
                class: "input-copo form-control",
                id: formElem.id,
                name: formElem.id,
                value: elemValue,
            });

        var minmax = "Min: " + min;

        var message_span = $('<span/>',
            {
                html: minmax,
                style: "font-size: 12px;"
            });


        if (formElem.hasOwnProperty("max")) {
            counter_ctrl.attr("max", formElem.max);
            message_span.html(minmax + "; Max: " + formElem.max);
        }

        ctrlsDiv.append(form_label_ctrl(formElem)).append(counter_ctrl).append(message_span);

        //set validation markers
        var vM = set_validation_markers(formElem, counter_ctrl);
        ctrlsDiv.append(vM.errorHelpDiv);

        return form_div_ctrl()
            .append(form_help_ctrl(formElem.help_tip))
            .append(ctrlsDiv);
    },
    do_dataverse_author: function do_dataverse_author(formElem) {
        alert('abc')
    },

};


function create_attachable_component(formElem) {
    var formCtrl = $('<form/>',
        {
            "data-toggle": "validator",
        });

    var formBodyDiv = $('<div/>',
        {
            class: "row formDivRow"
        }).append($('<div/>',
        {
            class: "col-sm-12 col-md-12 col-lg-12"
        }).append(formCtrl));

    var helpCtrl = $('<div/>',
        {
            html: '<span style="padding:6px;">Help tips</span><input class="copo-help-chk" type="checkbox" name="helptips-chk-sub">',
            class: "tips-switch-form-div form-group pull-right"
        });

    var helpDivRow = $('<div/>',
        {
            class: "row helpDivRow",
            style: "margin-bottom:20px;"
        });

    var cloneCol = $('<div/>',
        {
            class: "col-sm-7 col-md-7 col-lg-7 ctrlDIV"
        });

    var helpCtrlCol = $('<div/>',
        {
            class: "col-sm-5 col-md-5 col-lg-5"
        }).append(helpCtrl);

    helpDivRow.append(cloneCol).append(helpCtrlCol);

    var dialog = new BootstrapDialog({
        type: BootstrapDialog.TYPE_PRIMARY,
        size: BootstrapDialog.SIZE_NORMAL,
        title: function () {
            return $('<span>Create & Assign ' + formElem.label + '</span>');
        },
        closable: false,
        animate: true,
        draggable: false,
        onhide: function (dialogRef) {
            refresh_tool_tips();
        },
        onshown: function (dialogRef) {
            //prevent enter keypress from submitting form automatically
            formCtrl.keypress(function (e) {
                //Enter key
                if (e.which == 13) {
                    return false;
                }
            });

            //custom validators
            custom_validate(formCtrl);

            //validate on submit event
            formCtrl.validator().on('submit', function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                } else {
                    e.preventDefault();

                    var csrftoken = $.cookie('csrftoken');
                    var form_values = {};

                    formCtrl.find(":input").each(function () {
                        form_values[this.id] = $(this).val();
                    });

                    var auto_fields = JSON.stringify(form_values);

                    $.ajax({
                        url: copoFormsURL,
                        type: "POST",
                        headers: {'X-CSRFToken': csrftoken},
                        data: {
                            'task': "save",
                            'auto_fields': auto_fields,
                            'component': formElem.option_component,
                            'visualize': "created_component_json"
                        },
                        success: function (data) {
                            //get the selectize control
                            if (selectizeObjects.hasOwnProperty(formElem.id)) {
                                var selectizeControl = selectizeObjects[formElem.id];

                                //refresh options with the newly created record
                                var options = formElem.option_values.options;
                                options.unshift(data.option_values.options[0]); //expects one item in the returned options

                                //refresh the control
                                selectizeControl.addOption(options);
                                selectizeControl.refreshOptions();

                                //set the new record
                                selectizeControl.setValue(data.created_record_id, false);

                                refresh_tool_tips();
                            }

                            refresh_tool_tips();

                            dialogRef.close();
                        },
                        error: function () {
                            alert("Couldn't create and assign record!");
                        }
                    });
                }
            });

            //refresh form validator
            refresh_validator(formCtrl);

            //refresh controls
            refresh_tool_tips();

            //set up help tips
            set_up_help_ctrl("helptips-chk-sub");
        },
        buttons: [
            {
                label: 'Cancel',
                cssClass: 'tiny ui basic button',
                action: function (dialogRef) {
                    refresh_tool_tips();
                    dialogRef.close();
                }
            },
            {
                label: '<i class="copo-components-icons glyphicon glyphicon-save"></i> Save',
                cssClass: 'tiny ui basic primary button',
                action: function (dialogRef) {
                    validate_forms(formCtrl);
                }
            }
        ]
    });

    var $dialogContent = $('<div/>');

    var formLoader = get_spinner_image();

    $dialogContent.append(formLoader);
    $dialogContent.append(helpDivRow).append(formBodyDiv);
    dialog.realize();
    dialog.setMessage($dialogContent);
    dialog.open();

    var csrftoken = $.cookie('csrftoken');

    $.ajax({
        url: copoFormsURL,
        type: "POST",
        headers: {'X-CSRFToken': csrftoken},
        data: {
            'task': 'form_and_component_records',
            'component': formElem.option_component
        },
        success: function (data) {
            //generate controls and attach to form object
            var formSchema = data.form.form_schema;
            formCtrl.append(generate_form_controls(formSchema, data.form.form_value));

            //attach clone control
            if (data.component_records.length) {
                cloneCol.append(build_clone_control(data.component_records, formElem.label));

                //listen to clone control value change
                cloneCol.find(".copo-clone-control").on("change", function (event) {
                    event.preventDefault();

                    //retriev record and rebuild form
                    var formLoader2 = get_spinner_image();
                    formCtrl.html(formLoader2);

                    $.ajax({
                        url: copoFormsURL,
                        type: "POST",
                        headers: {'X-CSRFToken': csrftoken},
                        data: {
                            'task': "component_record",
                            'component': formElem.option_component,
                            'target_id': $(this).val()
                        },
                        success: function (clone_data) {
                            formLoader2.remove();
                            formCtrl.append(generate_form_controls(formSchema, clone_data.component_record));

                            //refresh form validator
                            refresh_validator(formCtrl);

                            //refresh controls
                            refresh_tool_tips();
                        },
                        error: function () {
                            alert("Couldn't retrieve clone record!");
                        }
                    });
                });
            }

            formLoader.remove();

        },
        error: function () {
            alert("Couldn't create requested form");
        }
    });

}


function form_help_ctrl(tip) {
    if (tip) {
        return $('<span/>',
            {
                html: tip,
                class: "form-input-help",
                style: "display:none;"
            });
    } else {
        return '';
    }
}

function form_div_ctrl() {
    return $('<div/>',
        {
            style: "padding-bottom:5px; outline: 0;",
            class: "form-group copo-form-group",
            tabindex: -1
        });
}

function form_label_ctrl(formElem) {
    var lbl = formElem.label;
    var target = formElem.id;
    var lblCtrl = '';

    if (formElem.hasOwnProperty("required") && (formElem.required.toString().toLowerCase() == "true")) {
        lbl = lbl + "<span class='constraint-label required-label'> required</span>";
    } else if (formElem.hasOwnProperty("field_constraint") && (formElem.field_constraint.trim().toLowerCase() != "")) {
        var dclass = "constraint-label " + formElem.field_constraint.trim().toLowerCase() + "-label";
        var dval = formElem.field_constraint.trim().toLowerCase();
        lbl = lbl + "<span class='" + dclass + "'>" + dval + "</span>";
    }

    if (lbl) {
        lblCtrl = $('<label/>',
            {
                html: lbl,
                for: target,
                class: "control-label"
            });
    }
    return lblCtrl
}

function do_array_ctrls(ctrlsDiv, counter, formElem) {
    var addbtnDiv = $('<div/>',
        {
            style: 'margin-top:2px;',
            class: 'array-add-new-button-div'
        });

    var addBtn = $('<button/>',
        {
            style: "border-radius:0;",
            class: "btn btn-xs btn-success",
            type: "button",
            html: '<i class="fa fa-plus-circle"></i> Add ' + formElem.label,
            click: function (event) {
                event.preventDefault();
                ++counter;

                get_element_clone(ctrlsDiv, counter).insertBefore(addbtnDiv);

                //refresh controls
                refresh_validator($(this).closest("form"));
                refresh_tool_tips();
            }
        });

    addbtnDiv.append(addBtn);

    return addbtnDiv;
}

function get_element_clone(ctrlsDiv, counter) {
    var ctrlClone = ctrlsDiv.clone();

    ctrlClone.find(':input').each(function () {
        if (this.id) {
            var elemID = this.id;
            $(this).attr("id", elemID + global_key_split + counter);
            $(this).attr("name", elemID + global_key_split + counter);
        }
    });

    // ctrlClone.find(':input').each(function () {
    //     if (this.id) {
    //         var elemID = this.id;
    //         $(this).attr("id", elemID + global_key_split + counter);
    //         $(this).attr("name", elemID + global_key_split + counter);
    //     }
    // });

    var cloneDiv = $('<div/>',
        {
            style: 'margin-top:20px;'
        });


    var delDiv = $('<div/>',
        {
            style: 'padding:5px;'
        });

    var delBtn = $('<button/>',
        {
            style: "border-radius:0;",
            type: "button",
            class: "btn btn-xs btn-danger pull-right",
            html: '<i class="fa fa-trash-o"></i> Delete',
            click: function (event) {
                event.preventDefault();
                cloneDiv.remove();
            }
        });

    delDiv.append(delBtn);
    cloneDiv.append(ctrlClone).append(delDiv);

    return cloneDiv
}

function resolve_ctrl_values(ctrlsDiv, counter, formElem, elemValue) {
    var ctrlsWithValuesDiv = ctrlsDiv.clone();
    var ctrlsWithValuesDivArray = '';

    //validate elemValue
    if (Object.prototype.toString.call(elemValue) === '[object Object]') {
        if ($.isEmptyObject(elemValue)) {
            elemValue = "";
        }
    }

    if (elemValue) {
        if (formElem.type == "array") {
            if (elemValue.length > 0) {

                //first element should not be open to deletion
                ctrlsWithValuesDiv.find(":input").each(function () {
                    if (this.id) {
                        var sendOfValue = elemValue;
                        if (Object.prototype.toString.call(elemValue) === '[object Array]') {
                            sendOfValue = elemValue[0];
                        }

                        var resolvedValue = resolve_ctrl_values_aux_1(this.id, formElem, sendOfValue);
                        $(this).val(resolvedValue);
                        this.setAttribute("value", resolvedValue);
                    }
                });

                //sort other elements of the elemValue array
                if (Object.prototype.toString.call(elemValue) === '[object Array]' && elemValue.length > 1) {
                    ctrlsWithValuesDivArray = $('<div/>');

                    for (var i = 1; i < elemValue.length; ++i) {
                        ++counter;

                        var ctrlsWithValuesDivSiblings = get_element_clone(ctrlsDiv.clone(), counter);
                        ctrlsWithValuesDivSiblings.find(":input").each(function () {
                            if (this.id) {

                                var tId = this.id.substring(0, this.id.lastIndexOf(global_key_split)); //strip off subscript

                                var resolvedValue = resolve_ctrl_values_aux_1(tId, formElem, elemValue[i]);
                                $(this).val(resolvedValue);
                                this.setAttribute("value", resolvedValue);
                            }
                        });

                        ctrlsWithValuesDivArray.append(ctrlsWithValuesDivSiblings);
                    }
                }
            }

        } else {//not array type elemValue
            ctrlsWithValuesDiv.find(":input").each(function () {
                if (this.id) {
                    var sendOfValue = elemValue;

                    if (Object.prototype.toString.call(elemValue) === '[object Array]') {
                        sendOfValue = elemValue.join();
                    }

                    var resolvedValue = resolve_ctrl_values_aux_1(this.id, formElem, sendOfValue);
                    $(this).val(resolvedValue);
                    this.setAttribute("value", resolvedValue);

                    if ($(this).prop("tagName") == "SELECT") {//this was what worked, as .val() failed to dance
                        for (var i = 0; i < this.length; ++i) {
                            if (this.options[i].value == resolvedValue) {
                                this.options[i].setAttribute("selected", "selected");
                                break;
                            }
                        }
                    }

                }
            });
        }
    }

    var ctrlObjects = {};
    ctrlObjects['counter'] = counter;
    ctrlObjects['ctrlsWithValuesDivArray'] = ctrlsWithValuesDivArray;
    ctrlObjects['ctrlsWithValuesDiv'] = ctrlsWithValuesDiv;

    return ctrlObjects;
}

function resolve_ctrl_values_aux_1(ctrlObjectID, formElem, elemValue) {
    var embedValue = null;

    if (ctrlObjectID.length == formElem.id.length) { //likely end-point element
        embedValue = elemValue;
    } else if (ctrlObjectID.length > formElem.id.length) { //likely a composite element
        var elemKeys = ctrlObjectID.split(formElem.id + ".").slice(-1)[0].split(".");

        embedValue = elemValue;
        for (var i = 0; i < elemKeys.length; ++i) {
            embedValue = embedValue[elemKeys[i]];
        }
    }

    return embedValue;
}

function get_basic_input(sp, formElem) {
    var fv = formElem.id.split(".").slice(-1)[0];

    var input = ($('<input/>',
        {
            type: "text",
            placeholder: formElem.placeholder,
            id: fv,
            name: fv,
            class: 'form-control'
        }));
    if (sp) {
        $(sp).append(input)
        return sp
    }
    return input
}

function get_basic_label(sp, formElem) {
    var fv = formElem.id.split(".").slice(-1)[0];
    var label = $('<label/>',
        {
            for: fv
        }).html(formElem.label)
    return label
}

function get_ontology_span_2(ontologySpan, formElem) {
    var ontologySchema = copoSchemas[formElem.control.toLowerCase()];
    ontologySpan.addClass("ontology-parent"); //used for selecting siblings in auto-complete

    var localolsURL = olsURL;

    for (var i = 0; i < ontologySchema.length; ++i) {
        var fv = ontologySchema[i].id.split(".").slice(-1)[0];

        ontologySpan.append($('<input/>',
            {
                type: "hidden",
                class: "ontology-field-hidden",
                id: fv,
                name: fv,
                "data-key": fv
            }));
    }

    //set restricted ontologies
    if (formElem.ontology_names && formElem.ontology_names.length) {
        localolsURL = olsURL.replace("999", formElem.ontology_names.join(","));
    }

    //build select; basis for auto-completion
    var selectCtrl = $('<select/>',
        {
            class: "form-control input-copo onto-select",
            "data-url": localolsURL,
            "data-element": formElem.id,
            "data-validate": true
        });

    ontologySpan.append(selectCtrl);

    var label = $('<div/>',
        {
            style: "margin-top:5px;  padding:3px; background-image:none; border-color:transparent; word-wrap: break-word;",
            class: "onto-label ontol-span webpop-content-div alert alert-default",
            title: "Ontology field",
            html: '<span class="ontology-label"><i class="fa fa-align-justify free-text" style="padding-right: 5px; display: none;"></i><img class="non-free-text" src="/static/copo/img/ontology2.png" style="cursor:pointer;"></span><span class="onto-label-span"></span><span class="onto-label-more collapse"></span>'
        });

    ontologySpan.append(label);

    return ontologySpan;
}

function get_lookup_span(ctrlsDiv, formElem) {
    var localolsURL = lookupsURL;

    //specify target component
    if (formElem.hasOwnProperty('data_source')) {
        localolsURL = lookupsURL.replace("999", formElem.data_source);
    }

    var hiddenValuesCtrl = $('<input/>',
        {
            type: "hidden",
            id: formElem.id,
            name: formElem.id,
            class: "copo-multi-values",
            "data-maxItems": 1, //to accommodate multiple values, set type in schema to 'array'
        });

    var elemJson = [];
    if (formElem.hasOwnProperty("option_values")) {
        elemJson = formElem.option_values;
    }

    var hiddenJsonCtrl = $('<input/>',
        {
            type: "hidden",
            class: "elem-json",
            value: JSON.stringify(elemJson)
        });

    var placeholder = "Lookup " + formElem.label + "...";
    if (formElem.hasOwnProperty("placeholder")) {
        placeholder = formElem.placeholder;
    }

    var selectCtrl = $('<select/>',
        {
            class: "input-copo copo-lookup ",
            "data-url": localolsURL,
            placeholder: placeholder,
            multiple: "multiple",
            "data-validate": true
        });

    ctrlsDiv.append(selectCtrl).append(hiddenValuesCtrl).append(hiddenJsonCtrl);

    //set validation markers
    var vM = set_validation_markers(formElem, selectCtrl);
    ctrlsDiv.append(vM.errorHelpDiv);

    return ctrlsDiv;
}

function get_multi_search_span(formElem, ctrlsDiv) {
    //build hidden fields to hold selected options and supply control data respectively

    var data_maxItems = 'null';
    if (formElem.data_maxItems) {
        data_maxItems = formElem.data_maxItems;
    }

    var hiddenValuesCtrl = $('<input/>',
        {
            type: "hidden",
            id: formElem.id,
            name: formElem.id,
            class: "copo-multi-values",
            "data-maxItems": data_maxItems, //sets the maximum selectable elements, default is 'null'
        });

    var hiddenJsonCtrl = $('<input/>',
        {
            type: "hidden",
            class: "elem-json",
            value: JSON.stringify(formElem.option_values)
        });


    var quickViewClass = " "; //will be passed along on hovering an option to inform the display of option details.

    if (formElem.hasOwnProperty("option_component")) {
        quickViewClass = formElem.option_component;
    }

    var placeholder = "Select " + formElem.label + "...";
    if (formElem.hasOwnProperty("placeholder")) {
        placeholder = formElem.placeholder;
    }

    var selectCtrl = $('<select/>',
        {
            class: "input-copo copo-multi-search ",
            placeholder: placeholder,
            multiple: "multiple",
            "data-component": quickViewClass,
            "data-validate": true
        });

    ctrlsDiv.append(selectCtrl).append(hiddenValuesCtrl).append(hiddenJsonCtrl);

    //set validation markers
    var vM = set_validation_markers(formElem, selectCtrl);
    ctrlsDiv.append(vM.errorHelpDiv);

    return ctrlsDiv;
}

function get_form_ctrl(ctrlsDiv, formElem, elemValue) {
    //control clone parameters...
    var addbtnDiv = '';
    var counter = 0;

    //resolve control values
    var ctrlObjects = resolve_ctrl_values(ctrlsDiv.clone(), counter, formElem, elemValue);

    if (formElem.type == "array") {
        addbtnDiv = do_array_ctrls(ctrlsDiv.clone(), ctrlObjects.counter, formElem);
    }

    return form_div_ctrl()
        .append(form_label_ctrl(formElem))
        .append(ctrlObjects.ctrlsWithValuesDiv)
        .append(ctrlObjects.ctrlsWithValuesDivArray)
        .append(addbtnDiv)
        .append(form_help_ctrl(formElem.help_tip));
}

function validate_forms(formObject) {
    formObject.trigger('submit');
}

function custom_validate(formObject) {
    formObject.validator({
        custom: {
            unique: function ($el) {//validates for unique fields
                //get array of items for test
                //items in array must be of type String for the unique validation to work!!
                var uniqueArray = JSON.parse($el.attr("data-unique-array"));
                var newValue = $el.val().trim().toLowerCase();

                var oKFlag = true;

                $.each(uniqueArray, function (index, item) {
                    if (Object.prototype.toString.call(item) === '[object String]') {
                        if (newValue == item.trim().toLowerCase()) {
                            oKFlag = false;
                            return false;
                        }
                    }
                });

                if (!oKFlag) {
                    return "Not valid!";
                }
            },
            batch: function ($el) {
                //validates for batch unique fields, where the test focuses on siblings of the target element
                //having a common family name

                var uniqueArray = [];

                //get family name
                var familyName = $el.attr("data-family-name");

                //get siblings...with same family name
                $el.closest("form").find("[data-family-name='" + familyName + "']").each(function () {
                    if (this.id != $el.attr("id")) {
                        uniqueArray.push($(this).val().trim().toLowerCase());
                    }
                });

                var newValue = $el.val().trim().toLowerCase();

                var oKFlag = true;

                if (newValue != "") {
                    $.each(uniqueArray, function (index, item) {
                        if (Object.prototype.toString.call(item) === '[object String]') {
                            if (newValue == item) {
                                oKFlag = false;
                                return false;
                            }
                        }
                    });
                }

                if (!oKFlag) {
                    return "Not valid!";
                }
            },
            igroup: function ($el) {
                //validates for copo-input-group control

                var hiddenSibling = $("#" + $el.attr("id") + "_hidden");
                var newValue = hiddenSibling.val().trim();

                var oKFlag = true;

                if (newValue == "") {
                    oKFlag = false;
                }

                if (!oKFlag) {
                    return "Not valid!";
                }
            },
            phone: function ($el) {//validates for phone fields
                var re = /^\+?(0|[1-9]\d*)$/;
                var newValue = $el.val().trim();

                var oKFlag = re.test(newValue);

                if (!oKFlag) {
                    return "Not valid!";
                }
            },
            email: function ($el) {//validates for email fields
                var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                var newValue = $el.val().trim();

                var oKFlag = re.test(newValue);

                if (!oKFlag) {
                    return "Not valid!";
                }
            },
            characteristics: function ($el) {
                //validates for copo-characteristics specific case: using value to validate unit
                var validationSource = $el;

                var oKFlag = true;

                var dataKey = 'annotationValue';
                var elements = validationSource.closest(".ctrlDIV").find(".ontology-parent").find("[data-key='" + dataKey + "']");

                var valueElem = {'unit': '', 'value': ''};

                elements.each(function (indx, item) {
                    if (valueElem.hasOwnProperty(item.getAttribute('data-parent1'))) {
                        valueElem[item.getAttribute('data-parent1')] = $(item).val().trim();
                    }
                });

                var errorMessage = '';

                if (valueElem.value != '') {
                    //case: numeric value, no unit
                    if ($.isNumeric(valueElem.value) && valueElem.unit == '') {
                        errorMessage = 'Numeric value "' + valueElem.value + '" requires a unit!';
                        oKFlag = false;
                    }
                } else {
                    //case: unit specified for no value
                    if (valueElem.unit != '') {
                        errorMessage = 'Value required for unit "' + valueElem.unit + '"!';
                        oKFlag = false;
                    }
                }

                if (errorMessage) {
                    alert(errorMessage);
                } else {
                    //clear error flags

                    var valTarget = validationSource.closest(".ctrlDIV").find(".ontology-parent").find(".copo-validation-target");
                    var valSource = validationSource.closest(".ctrlDIV").find(".ontology-parent").find(".copo-validation-source");

                    valTarget.removeAttr("data-error");
                    valTarget.removeAttr("required");
                    valTarget.removeClass("has-error");
                    valTarget.closest(".form-group").removeClass("has-error has-danger");
                    valTarget.closest(".form-group").find(".with-errors").remove();

                    valSource.removeAttr("data-error");
                    valSource.removeAttr("required");
                    valSource.removeClass("has-error");
                    valSource.closest(".form-group").removeClass("has-error has-danger");
                    valSource.closest(".form-group").find(".with-errors").remove();
                }

                if (!oKFlag) {
                    return "Not valid!";
                }
            }
        }
    });
}

function save_form(formJSON) {
    var task = "save";
    var error_msg = "Couldn't add " + formJSON.form_label + "!";
    if (formJSON.target_id) {
        task = "edit";
        error_msg = "Couldn't edit " + formJSON.form_label + "!";
    }

    //manage auto-generated fields
    var form_values = Object();
    htmlForm.find("form").find(":input").each(function () {
        form_values[this.id] = $(this).val();
    });

    var auto_fields = JSON.stringify(form_values);

    //get the visualisation context (i.e., what to be displayed after form save) and pass on
    var visualize = "";
    if (formJSON.visualize) {
        visualize = formJSON.visualize;
    }

    csrftoken = $.cookie('csrftoken');

    $.ajax({
        url: copoFormsURL,
        type: "POST",
        headers: {'X-CSRFToken': csrftoken},
        data: {
            'task': task,
            'auto_fields': auto_fields,
            'component': formJSON.component_name,
            'visualize': visualize,
            'target_id': formJSON.target_id
        },
        success: function (data) {
            globalDataBuffer = data;
            if (data.table_data) {
                var event = jQuery.Event("refreshtable");
                $('body').trigger(event);

                //feedback
                if (data.action_feedback) {
                    do_crud_action_feedback(data.action_feedback);
                }
            }
        },
        error: function () {
            alert(error_msg);
        }
    });
} //end of function