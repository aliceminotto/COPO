var wizardMessages;
var sampleComponentRecords;
var wizardStages;
var wizardStagesMain;
var stagesFormValues = {};
var validateSetter = {};
var negotiatedStages = []; //holds info about stages resolved to be rendered
var sampleHowtos = null;
var currentIndx = 0;
var generatedSamples = [];
var tableID = null; //rendered table handle
var stepIntercept = false; //flag indicates if activation of the last stage of the wizard has been intercepted
var descriptionWizSummary = {}; //wizard summary stage content
var tempWizStore = null; // for holding wizard-related data pending wizard load event
var initialSampleAttributes = {}; //holds initial attributes shared by all samples before editing

$(document).ready(function () {
        //****************************** Event Handlers Block *************************//

        var component = "sample";
        var wizardURL = "/rest/sample_wiz/";
        var copoVisualsURL = "/copo/copo_visualize/";

        //test

        //end test

        //on the fly info element
        var onTheFlyElem = $("#on_the_fly_info");

        //handle hover info for copo-select control types

        $(document).on("mouseenter", ".selectize-dropdown-content .active", function (event) {
            if ($(this).closest(".copo-multi-search").length) {
                var recordId = $(this).attr("data-value"); // the id of the hovered-on option
                var associatedComponent = ""; //form control the event is associated

                //get the associated component
                var clss = $($(event.target)).closest(".input-copo").attr("class").split(" ");
                $.each(clss, function (key, val) {
                    var cssSplit = val.split("copo-component-control-");
                    if (cssSplit.length > 1) {
                        associatedComponent = cssSplit.slice(-1)[0];
                    }
                });

                resolve_element_view(recordId, associatedComponent);
            }
        });

        //handle inspect, describe - tabs
        $('#copo-datafile-tabs.nav-tabs a').on('shown.bs.tab', function (event) {
            var componentSelected = $(event.target).attr("data-component"); // active tab

            $("#copoSampleHelp").find(".component-help").removeClass("disabled");
            $("#copoSampleHelp").find(".component-help[data-component='" + componentSelected + "']").addClass("disabled");


            $("#generatedSamplesDiv").css("display", "none");
            $("#helptipsDiv").css("display", "block");
            set_samples_how_tos($(this).attr("data-component"));

            //check for temp data
            if (componentSelected == "descriptionWizardComponent" && tempWizStore) {
                do_post_stage_retrieval2(tempWizStore);
                tempWizStore = null;
            }
        });

        //handle help context
        $("#copoSampleHelp").find(".component-help").on("click", function (event) {
            event.preventDefault();

            $("#copoSampleHelp").find(".component-help").removeClass("disabled");

            $(this).addClass("disabled");

            var componentSelected = $(this).attr("data-component");

            $("#helptipsDiv").css("display", "block");
            set_samples_how_tos(componentSelected);

        });


        //handle popover close button
        $(document).on("click", ".popover .copo-close", function () {
            $(this).parents(".popover").popover('destroy');
        });

        //handle sample attributes view
        $(document).on("click", ".sample-view-button", function () {
            get_row_attributes($(this));
        });


        //handle keyboard strokes to advance through wizard
        //check if the control has focus
        $('#dataFileWizard').on('keypress', function (event, data) {

            if (event.keyCode == 13) {
                event.preventDefault();
                //here do the stage advance call
            }
            else if (event.keyCode == 39) {
                var d = {'step': $('#dataFileWizard').data('fu.wizard').currentStep, 'direction': 'next'};
                //d.step = $('#dataFileWizard').data('fu.wizard').currentStep
                //d.direction = 'next'
                $('#dataFileWizard').trigger('actionclicked.fu.wizard', d)
            }
            else if (event.keyCode == 37) {
                var d = {'step': $('#dataFileWizard').data('fu.wizard').currentStep, 'direction': 'previous'};
                //d.step = $('#dataFileWizard').data('fu.wizard').currentStep
                //d.direction = 'next'
                $('#dataFileWizard').trigger('actionclicked.fu.wizard', d)
            }
        });


        // get table data to display via the DataTables API
        var loaderObject = $('<div>',
            {
                style: 'text-align: center',
                html: "<span class='fa fa-spinner fa-pulse fa-3x'></span>"
            });


        var tLoader = loaderObject.clone();
        $("#data_all_data").append(tLoader);

        csrftoken = $.cookie('csrftoken');

        $.ajax({
            url: copoVisualsURL,
            type: "POST",
            headers: {'X-CSRFToken': csrftoken},
            data: {
                'task': 'table_data',
                'component': component
            },
            success: function (data) {
                do_render_table(data);
                tLoader.remove();
            },
            error: function () {
                alert("Couldn't retrieve samples!");
            }
        });

        //review-to-stage
        $(document).on("click", ".review-to-stage", function (event) {
            event.preventDefault();

            $('#dataFileWizard').wizard('selectedItem', {
                step: $(this).attr("data-stage-indx")
            });
        });


        //******************************* wizard events *******************************//

        // retrieve wizard messages
        $.ajax({
            url: wizardURL,
            type: "POST",
            headers: {'X-CSRFToken': csrftoken},
            data: {
                'request_action': 'sample_wizard_components'
            },
            success: function (data) {
                sampleHowtos = data.wiz_howtos;
                wizardStagesMain = data.wizard_stages;
                wizardStages = data.wizard_stages;
                wizardMessages = data.wiz_message;
                sampleComponentRecords = data.component_records;
                set_samples_how_tos("generalHelpTips");
                set_wizard_summary();

            },
            error: function () {
                alert("Couldn't retrieve wizard message!");
            }
        });


        //handle event for exiting current description...
        $('#remove_act').on('click', function (event) {
            //confirm user decision
            var dialog = new BootstrapDialog({
                buttons: [
                    {
                        label: 'Cancel',
                        action: function (dialogRef) {
                            dialogRef.close();
                        }
                    },
                    {
                        label: 'Exit Wizard',
                        cssClass: 'btn-primary',
                        action: function (dialogRef) {
                            dialogRef.close();
                            clear_wizard();
                        }
                    }
                ]
            });

            dialog_display(dialog, "Wizard Exit Alert", wizardMessages.exit_wizard_message.text, "warning");

        });


        //handle event for clicking an previously visited step, intercept here to save entries
        $('#dataFileWizard').on('stepclicked.fu.wizard', function (evt, data) {
            evt.preventDefault();

            // get the proposed or intended state for which action is intercepted
            before_step_back(data.step);
        });

        $('#dataFileWizard').on('changed.fu.wizard', function (evt, data) {
            //set up / refresh form validator
            set_up_validator();
        });


        //handle events for step change
        $('#dataFileWizard').on('actionclicked.fu.wizard', function (evt, data) {
            $(self).data('step', data.step);

            stage_navigate(evt, data);
        });

        // handle/attach events to table buttons
        $('body').on('addbuttonevents', function (event) {
            tableID = event.tableID;

            $(document).on("click", ".copo-dt", function (event) {
                do_record_task($(this));
            });

        });


        //instantiate/refresh tooltips
        refresh_tool_tips();


        //****************************** Functions Block ******************************//
        function add_step(auto_fields) {
            //step being requested
            currentIndx += 1;

            //first, make call to resolve the active stage data
            var stage_data = collate_stage_data();

            do_post_stage_retrieval(stage_data);

            //if no data, just go ahead and retrieve stage

        }

        function stage_navigate(evt, data) {

            if (data.direction == 'next') {
                // empty info element
                onTheFlyElem.empty();

                //trigger form validation
                if ($("#wizard_form_" + data.step).length) {
                    $('#wizard_form_' + data.step).trigger('submit');

                    if ($('#wizard_form_' + data.step).find("#bcopovalidator").val() == "false") {
                        $('#wizard_form_' + data.step).find("#bcopovalidator").val("true");

                        evt.preventDefault();
                        return false;
                    }
                }


                var lastElementIndx = $('.steps li').last().index() + 1;
                var activeElementIndx = $('#dataFileWizard').wizard('selectedItem').step; //active stage index

                stepIntercept = false;

                if (lastElementIndx - activeElementIndx == 1) {
                    evt.preventDefault();
                    stepIntercept = true;
                }

                // get form inputs
                var form_values = Object();

                $('#wizard_form_' + data.step).find(":input").each(function () {
                    form_values[this.id] = $(this).val();
                });

                //trigger event for setting initial sample attributes
                if (form_values.hasOwnProperty("current_stage") && form_values["current_stage"] == "sample_attributes") {
                    initialSampleAttributes = form_values;
                }

                var auto_fields = JSON.stringify(form_values);

                //trap review stage here, which, in essence, provides a signal to wrap up the wizard
                var reviewElem = $('.steps li:last-child');

                if (reviewElem.hasClass('active')) {
                    evt.preventDefault();
                    //send samples to be saved

                    var dialogHandle = processing_request_dialog('<span class="loading">Generating Samples. Please wait...</span>');

                    $.ajax({
                        url: wizardURL,
                        type: "POST",
                        headers: {'X-CSRFToken': csrftoken},
                        data: {
                            'request_action': 'save_samples',
                            'generated_samples': JSON.stringify(generatedSamples),
                            'sample_type': get_stage_inputs_by_ref("sample_type")["sample_type"]
                        },
                        success: function (data) {
                            //clear_wizard(); no point...if we are reloading the page
                            window.location.reload();
                        },
                        error: function () {
                            alert("Couldn't save samples!");
                        }
                    });

                    return false;

                }

                //set current stage
                currentIndx = data.step;
                add_step(auto_fields);

            } else if (data.direction == 'previous') {
                // get the proposed or intended state, for which action is intercepted
                evt.preventDefault();

                before_step_back(data.step - 1);
            }

            //setup steps fast navigation
            //steps_fast_nav();
        }

        function processing_request_dialog(message) {
            var $textAndPic = $('<div></div>');
            $textAndPic.append("<div style='text-align: center'><i class='fa fa-spinner fa-pulse fa-2x'></i></div>");

            var dialogInstance = new BootstrapDialog()
                .setTitle(message)
                .setMessage($textAndPic)
                .setType(BootstrapDialog.TYPE_INFO)
                .setSize(BootstrapDialog.SIZE_NORMAL)
                .setClosable(false)
                .open();

            return dialogInstance
        }

        //trigger save action before navigating back a stage
        function before_step_back(proposedState) {
            $('#dataFileWizard').wizard('selectedItem', {
                step: proposedState
            });

            return;

        }


        function do_post_stage_retrieval2(data) {
            if (!data.stage_ref) {//this should indicate call to display first stage of the wizard
                if (currentIndx > 0) {
                    if (($('#dataFileWizard').is(":visible"))) {
                        reset_wizard();
                    }
                } else {
                    currentIndx += 1;
                    initiate_wizard();
                }

            }

            // wizard 'staging' process
            if (!($('#dataFileWizard').is(":visible"))) {


                $('#dataFileWizard').show();

                $('.steps li:last-child').hide(); //hide the last (static) stage of the wizard

                //show wizard exit button
                $('#remove_act').parent().show();
            }

            process_wizard_stage(data);


            //toggle show 'Review' stage
            var elem = $('.steps li:last-child');

            if (elem.hasClass('active')) {
                //call to set description summary data

                set_generated_samples();
                elem.show();
            } else {
                elem.hide();
            }

            //form controls help tip
            setup_element_hint();

            //autocomplete
            auto_complete();
        }

        function do_post_stage_retrieval(data) {
            //update items with data

            if (($('#dataFileWizard').is(":visible"))) {
                do_post_stage_retrieval2(data);
            } else {
                //store data pending tab shown
                tempWizStore = data;

                $('#copo-datafile-tabs.nav-tabs a[href="#descriptionWizardComponent"]').tab('show');
            }


        }

        function process_wizard_stage(data) {
            var stage = Object();
            if (data.hasOwnProperty("stage_ref")) {
                var stage = stage_description(data.stage_ref);
            }

            if (stage.hasOwnProperty("ref")) {

                $('#dataFileWizard').wizard('addSteps', currentIndx, [
                    {
                        badge: ' ',
                        label: '<span class=wiz-title>' + stage.title + '</span>',
                        pane: get_pane_content(wizardStagesForms(stage), currentIndx, stage.message)
                    }
                ]);

                //give focus to the added step
                $('#dataFileWizard').wizard('selectedItem', {
                    step: currentIndx
                });

                //refresh tooltips
                auto_complete();

            } else {
                if (stepIntercept) {
                    $('#dataFileWizard').wizard('selectedItem', {
                        step: $('#dataFileWizard').wizard('selectedItem').step + 1
                    });
                }
            }

            //refresh tooltips
            refresh_tool_tips();

        } //end of func


        function set_up_validator() {
            $(document).find("form").each(function () {
                var theForm = $(this);
                var formJSON = Object();

                if (theForm.find("#current_stage").length) {

                    var current_stage = theForm.find("#current_stage").val();

                    for (var i = 0; i < negotiatedStages.length; ++i) {
                        if (current_stage == negotiatedStages[i].ref) {
                            formJSON = negotiatedStages[i].items;
                            break;
                        }
                    }

                    if (!validateSetter.hasOwnProperty(current_stage)) {

                        refresh_validator($(this));

                        var bvalidator = $('<input/>',
                            {
                                type: "hidden",
                                id: "bcopovalidator",
                                name: "bcopovalidator",
                                value: "true"
                            });

                        //add validator flag
                        theForm.append(bvalidator);


                        theForm.validator().on('submit', function (e) {
                            if (e.isDefaultPrevented()) {
                                $(this).find("#bcopovalidator").val("false");
                                return false;
                            } else {
                                e.preventDefault();
                                $(this).find("#bcopovalidator").val("true");

                                if (!global_form_validate(formJSON, theForm)) {
                                    $(this).find("#bcopovalidator").val("false");
                                    return false;
                                }
                            }
                        });

                        validateSetter[current_stage] = "1";
                    }

                }
            });

        }

        var dispatchStageCallback = {
            get_sample_type_stages: function (param) {
                var stages = null;

                if (stagesFormValues.hasOwnProperty(param)) {
                    stages = wizardStages[stagesFormValues[param][param]];
                }

                return stages;
            },
            display_sample_clone: function (param) {
                //param is confirmation of sample clone
                //function decides whether to display the clone stage given user's choice or
                // the existence (lack of i.e) candidate samples
                var displayStage = false;

                if (stagesFormValues.hasOwnProperty(param)) {
                    displayStage = stagesFormValues[param][param];

                    if (displayStage == "yes") {
                        displayStage = true;
                    } else {
                        displayStage = false;
                    }
                }

                return displayStage;
            },
            confirm_sample_clone: function (param) {
                //function decides if sample-clone-confirmation stage should be displayed or not
                //this is based on the presence of samples in the profile

                var displayStage = false;
                if (sampleComponentRecords.length > 0) {
                    displayStage = true;
                }

                return displayStage;
            }
        }; //end of dispatchStageCallback

        function stage_description(current_stage) {
            var stage = null;
            if (current_stage == "") {
                //start first stage in the description process
                $.each(wizardStages.start, function (key, val) {
                    negotiatedStages.push(val);
                });

                stage = negotiatedStages[0];
                negotiatedStages[0].activated = true;

            } else {
                //there is a previous stage, use this to resolve next stage

                //...but, has this stage been previously rendered?

                var currIndx = -1;
                for (var i = 0; i < negotiatedStages.length; ++i) {
                    if (current_stage == negotiatedStages[i].ref) {
                        currIndx = i + 1;
                        break;
                    }
                }

                if (currIndx < negotiatedStages.length) {
                    if (negotiatedStages[currIndx].hasOwnProperty("activated") && negotiatedStages[currIndx].activated) {
                        stage = Object(); //no stage to return
                    } else {
                        stage = negotiatedStages[currIndx];
                        negotiatedStages[currIndx].activated = true;

                        //check if it is a stage stub
                        if (stage.hasOwnProperty("is_stage_stub") && stage.is_stage_stub) {
                            var new_stages = dispatchStageCallback[stage.callback.function](stage.callback.parameter);
                            if (new_stages) {
                                new_stages.forEach(function (item) {
                                    negotiatedStages.push(item);
                                });
                            }

                            //verify next stage validity...again!
                            if ((currIndx + 1) < negotiatedStages.length) {
                                currIndx = currIndx + 1;
                                stage = negotiatedStages[currIndx];
                                negotiatedStages[currIndx].activated = true;
                            } else {
                                stage = Object(); //no stage to return
                            }
                        }

                        //check for conditional stage
                        if (stage.hasOwnProperty("is_conditional_stage") && stage.is_conditional_stage) {
                            var flag = dispatchStageCallback[stage.callback.function](stage.callback.parameter);

                            if (!flag) {
                                //move one step forward
                                if ((currIndx + 1) < negotiatedStages.length) {
                                    currIndx = currIndx + 1;
                                    stage = negotiatedStages[currIndx];
                                    negotiatedStages[currIndx].activated = true;
                                } else {
                                    stage = Object(); //no stage to return
                                }
                            }
                        }
                    }
                } else {
                    //this should signal end of stages

                    stage = Object(); //no stage to return
                }
            }

            if (stage.hasOwnProperty("ref")) {

                stage.data = Object(); //no data needed

                if (stage.ref == "sample_attributes") {
                    var cloneRecord = get_clone_data();
                    if (!$.isEmptyObject(cloneRecord)) {
                        stage.data = cloneRecord;
                    }
                }
            }

            return stage;
        }

        function get_clone_data() {
            var cloneRecordID = get_stage_inputs_by_ref("sample_clone");
            cloneRecordID = cloneRecordID["sample_clone"];

            var cloneRecord = Object();
            var dataCopy = $.extend(true, Object(), sampleComponentRecords);

            $.each(dataCopy, function (key, val) {
                if (val._id == cloneRecordID) {
                    cloneRecord = val;
                    return false;
                }
            });

            return cloneRecord;

        }

        function get_pane_content(stage_content, currentIndx, stage_message) {
            var stageHTML = $('<div/>', {
                id: "stage-controls-div-" + currentIndx
            });

            //'apply to all', alert trigger controls, and description context message

            var panelGroup = $('<div/>', {
                class: "panel-group wizard-message-panel",
                id: "alert_placeholder_" + currentIndx
            });

            //stageHTML.append(panelGroup);

            var panelPrimary = $('<div/>', {
                class: "panel panel-primary",
                style: "border: 2px solid #3278b4;"
            });

            var panelHeading = $('<div/>', {
                class: "panel-heading",
                style: "background-image: none; padding: 5px 15px;"
            });

            var headerRow = $('<div/>', {
                class: "row"
            });

            var spanMessage = $('<span/>', {
                html: "<strong>Apply this description to all items in the description bundle?</strong>"
            });

            var spanInput = $('<span/>', {
                style: "font-weight: bold; margin-left: 5px;",
                html: '<input type="checkbox" name="apply-scope-chk-' + currentIndx + '" checked data-size="mini" data-on-color="primary" data-off-color="default" data-on-text="Yes" data-off-text="No">'
            });

            var leftColumn = $('<div/>', {
                class: "col-sm-11 col-md-11 col-lg-11"
            });

            leftColumn.append(spanMessage).append(spanInput);

            var rightColumn = $('<div/>', {
                class: "col-sm-1 col-md-1 col-lg-1",
                html: '<a data-toggle="collapse" href="#collapseAlert" title="Toggle display" class="fa fa-bell pull-right control-message-trigger" style="text-decoration: none; color: white; font-weight: 800;"></a>'
            });

            headerRow.append(leftColumn).append(rightColumn);
            panelHeading.append(headerRow);

            var panelCollapse = $('<div/>', {
                class: "panel-collapse collapse message-pane-collapse",
                id: "collapseAlert"
            });

            var panelBody = $('<div/>', {
                class: "panel-body wizard-control-message",
            });

            var panelFooter = $('<div/>', {
                class: "panel-footer"
            });

            panelCollapse.append(panelBody).append(panelFooter);
            panelPrimary.append(panelHeading).append(panelCollapse);
            panelGroup.append(panelPrimary);


            //form controls
            var formPanel = $('<div/>', {
                class: "panel panel-copo-data panel-primary",
                style: "margin-top: 5px; font-size: 12px;"
            });

            var formPanelHeading = $('<div/>', {
                class: "panel-heading",
                style: "background-image: none; font-size: 14px;",
                html: stage_message
            });

            formPanel.append(formPanelHeading);

            stageHTML.append(formPanel);

            var formPanelBody = $('<div/>', {
                class: "panel-body"
            });

            formPanel.append(formPanelBody);

            var formDiv = $('<div/>', {
                style: "margin-top: 20px;"
            });

            formPanelBody.append(formDiv);

            var formCtrl = $('<form/>',
                {
                    id: "wizard_form_" + currentIndx
                });

            var buttonRowDiv = $('<div/>', {
                class: "row"
            });

            var buttonColDiv = $('<div/>', {
                class: "col-sm-12 col-md-12 col-lg-12"
            });


            buttonRowDiv.append(buttonColDiv)

            formCtrl.append(stage_content).append(buttonRowDiv);


            formDiv.append(formCtrl);

            return stageHTML;
        }

        function initiate_wizard() {
            $('#dataFileWizard').wizard();

            //add review step, then other steps
            $('#dataFileWizard').wizard('addSteps', -1, [
                descriptionWizSummary
            ]);
        }

        //functions clears the wizard and either exits or loads next item in batch
        function clear_wizard() {
            //todo: need to decide what to save here before quitting the wizard

            //decommission wizard
            $('#dataFileWizard').wizard('removeSteps', 1, currentIndx + 1);
            $('#dataFileWizard').hide();

            //clear wizard buttons
            $('#wizard_steps_buttons').html('');


            //reset index
            currentIndx = 0;

            //hide discard button
            $('#remove_act').parent().hide();

            //clear generated sample table
            if ($.fn.dataTable.isDataTable('#generated_samples_table')) {
                //if table instance already exists, then do refresh
                var table = $('#generated_samples_table').DataTable();

                table
                    .clear()
                    .draw();
                table
                    .rows
                    .add([]);
                table
                    .columns
                    .adjust()
                    .draw();
                table
                    .search('')
                    .columns()
                    .search('')
                    .draw();
            }

            //remove negotiated stages and samples data
            negotiatedStages = [];
            generatedSamples = [];

            //switch info context
            $("#copoSampleHelp").find(".component-help").removeClass("disabled");
            $("#copoSampleHelp").find(".component-help[data-component='fileListComponent']").addClass("disabled");
            $("#generatedSamplesDiv").css("display", "none");
            $("#helptipsDiv").css("display", "block");

            //switch from wizard panel
            tempWizStore = null;

            //switch to file list context
            $('#copo-datafile-tabs.nav-tabs a[href="#fileListComponent"]').tab('show');

            //clear on the fly help
            $("#on_the_fly_info").empty();

            stagesFormValues = {};
            validateSetter = {};
            stepIntercept = false;
        }

        function reset_wizard() {//resets wizard without all the hassle of clear_wizard()
            $('#dataFileWizard').wizard('removeSteps', 1, currentIndx + 1);

            //clear wizard buttons
            $('#wizard_steps_buttons').html('');

            //add review step, then other steps
            $('#dataFileWizard').wizard('addSteps', -1, [
                descriptionWizSummary
            ]);

            currentIndx = 1;
        }

        function collate_stage_data() {
            //get active stage
            var activeStageIndx = $('#dataFileWizard').wizard('selectedItem').step; //active stage index

            if (activeStageIndx == -1) {
                return false;
            }


            //get form elements for current stage
            var form_values = Object();

            $('#wizard_form_' + activeStageIndx).find(":input").each(function () {
                form_values[this.id] = $(this).val();
            });

            var data = {"stage_ref": ""};

            if (form_values.hasOwnProperty("current_stage")) {
                stagesFormValues[form_values.current_stage] = form_values;
                data = {"stage_ref": form_values.current_stage};
            }

            return data;

        }


        function add_new_samples() {
            var data = {"stage_ref": ""};

            //refresh wizard stages
            wizardStages = $.extend(true, Object(), wizardStagesMain);

            do_post_stage_retrieval(data);
        }


        //handles button events on a record or group of records
        function do_record_task(elem) {
            var task = elem.attr('data-record-action').toLowerCase(); //action to be performed e.g., 'Edit', 'Delete'
            var taskTarget = elem.attr('data-action-target'); //is the task targeting a single 'row' or group of 'rows'?

            var ids = [];
            var records = [];
            var table = null;


            //retrieve event targets
            if ($.fn.dataTable.isDataTable('#' + tableID)) {
                table = $('#' + tableID).DataTable();

                if (taskTarget == 'row') {
                    ids = [elem.attr('data-record-id')];
                } else {
                    ids = $.map(table.rows('.selected').data(), function (item) {
                        return item[item.length - 1];
                    });
                }

                var records = []; //richer information context, retained for other purposes, e.g., description batch
                $.map(table.rows('.selected').data(), function (item) {
                    records.push(item);
                });

            }

            //handle button action
            if (task == "new_samples") {//event for creating new sample(s)

                add_new_samples();

            } else if (task == "delete" && ids.length > 0) { //handles delete, allows multiple row delete
                var deleteParams = {component: component, target_ids: ids};
                do_component_delete_confirmation(deleteParams);

            } else if (task == "edit" && ids.length > 0) { //handles edit
                $.ajax({
                    url: copoFormsURL,
                    type: "POST",
                    headers: {'X-CSRFToken': csrftoken},
                    data: {
                        'task': 'form',
                        'component': component,
                        'target_id': ids[0] //only allowing row action for edit, hence first record taken as target
                    },
                    success: function (data) {
                        json2HtmlForm(data);
                    },
                    error: function () {
                        alert("Couldn't build " + component + " form!");
                    }
                });

            }
            else if (task == "info" && ids.length > 0) {
                var tr = elem.closest('tr');
                var row = table.row(tr);

                if (row.child.isShown()) {
                    //row is already open - close it
                    row.child.hide();
                } else {
                    var contentHtml = "<div style='text-align: center'><i class='fa fa-spinner fa-pulse fa-2x'></i></div>";
                    row.child(contentHtml).show();

                    $.ajax({
                        url: copoVisualsURL,
                        type: "POST",
                        headers: {'X-CSRFToken': csrftoken},
                        data: {
                            'task': 'attributes_display',
                            'component': component,
                            'target_id': ids[0]
                        },
                        success: function (data) {
                            row.child(build_attributes_display(data).html()).show();
                        },
                        error: function () {
                            alert("Couldn't retrieve sample attributes!");
                            return '';
                        }
                    });
                }
            }

        } //end of func

        function resolve_element_view(recordId, associatedComponent) {
            //maps form element by id to component type e.g source, sample

            if (associatedComponent == "") {
                return false;
            }

            onTheFlyElem.append(tLoader);

            $.ajax({
                url: copoVisualsURL,
                type: "POST",
                headers: {'X-CSRFToken': csrftoken},
                data: {
                    'task': "attributes_display",
                    'component': associatedComponent,
                    'target_id': recordId
                },
                success: function (data) {
                    onTheFlyElem.empty();
                    onTheFlyElem.append(build_attributes_display(data));
                },
                error: function () {
                    onTheFlyElem.empty();
                    onTheFlyElem.append("Couldn't retrieve attributes!");
                }
            });
        }


        function build_attributes_display(data) {
            //build view
            var attributesPanel = $('<div/>', {
                class: "panel panel-copo-data panel-default",
                style: "margin-top: 5px; font-size: 12px;"
            });

            var attributesPanelHeading = $('<div/>', {
                class: "panel-heading",
                style: "background-image: none;",
                html: "<strong>Sample Attributes</strong>"
            });

            attributesPanel.append(attributesPanelHeading);


            var attributesPanelBody = $('<div/>', {
                class: "panel-body"
            });

            var notAssignedSpan = $('<span/>', {
                class: "text-danger",
                html: "Attributes not assigned!"
            });

            attributesPanelBody.append(notAssignedSpan);


            if (data.hasOwnProperty("sample_attributes")) {
                //clear panel for new information
                attributesPanelBody.html('');

                //get schema
                var schema = data.sample_attributes.schema;

                //get record
                var record = data.sample_attributes.record;

                for (var i = 0; i < schema.length; ++i) {
                    var currentItem = schema[i];

                    var itemLabel = $('<div/>', {
                        html: currentItem.label,
                        style: "font-size:12px; font-weight:bold"
                    });

                    var itemDiv = $('<div/>', {
                        style: "padding: 5px; border: 1px solid #ddd; border-radius:2px; margin-bottom:3px;"
                    }).append(itemLabel).append(get_item_value_2(currentItem, record));

                    attributesPanelBody.append(itemDiv);

                }
            }


            attributesPanel.append(attributesPanelBody);

            var ctrlDiv = $('<div/>').append(attributesPanel);

            return ctrlDiv;
        }


        function setup_element_hint() {
            $(":input").focus(function () {
                var elem = $(this).closest(".copo-form-group");
                if (elem.length) {

                    var title = elem.find("label").html();
                    var content = "";
                    if (elem.find(".form-input-help").length) {
                        content = (elem.find(".form-input-help").html());
                    }

                    $('.popover').popover('hide'); //hide any shown popovers


                    var pop = elem.popover({
                        title: title,
                        content: content,
                        container: 'body',
                        trigger: 'hover',
                        placement: 'right',
                        template: '<div class="popover copo-popover-popover1"><div class="arrow">' +
                        '</div><div class="popover-inner"><h3 class="popover-title copo-popover-title1">' +
                        '</h3><div class="popover-content"><p></p></div></div></div>'
                    });

                }

            });
        }//end of function

        function steps_fast_nav() {
            $('#wizard_steps_buttons').html('');

            $('#wizard_steps_buttons').append('<span class="glyphicon glyphicon-arrow-right" style="font-size: 20px; ' +
                'vertical-align: text-bottom;"></span><span><label>Quick jump to step: &nbsp; </label></span>');

            var steps = $(".steps li:not(li:last-child)");
            steps.each(function (idx, li) {
                var lbl = idx + 1;
                var stp = $('<button/>',
                    {
                        text: lbl,
                        class: "btn btn-default copo-wiz-button",
                        title: $(li).find('.wiz-title').html(),
                        click: function () {
                            $('#dataFileWizard').wizard('selectedItem', {
                                step: idx + 1
                            });
                            var elems = $('.copo-wiz-button');
                            elems.removeClass();
                            elems.addClass('btn btn-default copo-wiz-button');
                            stp.removeClass();
                            stp.addClass('btn btn-primary copo-wiz-button');
                        }
                    });

                stp.tooltip();

                $('#wizard_steps_buttons').append(stp);

            });
        }

        function wizardStagesForms(stage) {
            var formValue = stage.data;

            var formDiv = $('<div/>');

            //build form elements
            for (var i = 0; i < stage.items.length; ++i) {
                var formElem = stage.items[i];
                var control = formElem.control;

                var elemValue = null;

                if (formValue) {
                    if (formValue[formElem.id]) {
                        elemValue = formValue[formElem.id];

                        if (!elemValue) {
                            if (formElem.default_value) {
                                elemValue = formElem.default_value;
                            } else {
                                elemValue = "";
                            }
                        }
                    }
                }

                if (formElem.hidden == "true") {
                    control = "hidden";
                }

                try {
                    formDiv.append(dispatchFormControl[controlsMapping[control.toLowerCase()]](formElem, elemValue));
                }
                catch (err) {
                    console.log(control.toLowerCase());
                    formDiv.append('<div class="form-group copo-form-group"><span class="text-danger">Form Control Error</span> (' + formElem.label + '): Cannot resolve form control!</div>');
                    console.log(err);
                }

                //any triggers?
                if (formElem.trigger) {
                    try {
                        dispatchEventHandler[formElem.trigger.callback.function](formElem);
                    }
                    catch (err) {
                    }
                }

            }

            //add current stage to form
            var hiddenCtrl = $('<input/>',
                {
                    type: "hidden",
                    id: "current_stage",
                    name: "current_stage",
                    value: stage.ref
                });

            formDiv.append(hiddenCtrl);

            return formDiv;
        }

        function element_value_change(formElem, elemValue, messageTitle) {
            var dialog = new BootstrapDialog({
                buttons: [
                    {
                        label: 'Cancel',
                        cssClass: 'btn-default',
                        action: function (dialogRef) {
                            //set back to previous value
                            $("#" + formElem.id).val(elemValue);

                            dialogRef.close();
                        }
                    },
                    {
                        label: 'Continue',
                        cssClass: 'btn-primary',
                        action: function (dialogRef) {
                            setTimeout(function () {
                                //reset the wizard...

                                if (stage_data) {
                                    $.ajax({
                                        url: wizardURL,
                                        type: "POST",
                                        headers: {'X-CSRFToken': csrftoken},
                                        data: stage_data,
                                        success: function (data) {
                                            clear_wizard();
                                        },
                                        error: function () {
                                            alert("Couldn't save entries!");
                                        }
                                    });
                                }

                            }, 1000);

                            dialogRef.close();
                        }
                    }
                ]
            });

            dialog_display(dialog, messageTitle, wizardMessages.stage_dependency_message.text, "warning");

        }


        var dispatchEventHandler = {
            study_type_change: function (formElem) {
                var previousValue = null;

                $(document)
                    .off("focus", "#" + formElem.id)
                    .on("focus", "#" + formElem.id, function () {
                        previousValue = this.value;
                    });

                $(document)
                    .off(formElem.trigger.type, "#" + formElem.id)
                    .on(formElem.trigger.type, "#" + formElem.id, function () {
                        element_value_change(formElem, previousValue, "Study Type Change");
                    });
            },
            target_repo_change: function (formElem) {
                var previousValue = null;

                $(document)
                    .off("focus", "#" + formElem.id)
                    .on("focus", "#" + formElem.id, function () {
                        previousValue = this.value;
                    });

                $(document)
                    .off(formElem.trigger.type, "#" + formElem.id)
                    .on(formElem.trigger.type, "#" + formElem.id, function () {
                        element_value_change(formElem, previousValue, "Target Repo Change");
                    });
            }
        };


        function set_wizard_summary() {
            descriptionWizSummary = {
                badge: ' ',
                label: '<span class=wiz-title>Review</span>',
                pane: '<div class="alert alert-default">' +
                '<div style="line-height: 150%;" class="' + wizardMessages.review_message.text_class + '">' +
                wizardMessages.review_message.text + '</div>' +
                '<div style="margin-top: 10px; max-width: 100%; overflow-x: auto;">' +
                '<table id="generated_samples_table" class="table table-striped table-bordered order-column hover copo-datatable copo-table-header" width="100%"></table>' +
                '</div></div>'
            };
        }

        function set_generated_samples() {
            //check if sample name has been entered before proceeding with sample display

            var namePrefix = get_stage_inputs_by_ref("sample_name");


            if ($.isEmptyObject(namePrefix)) {
                return false;
            } else {
                namePrefix = namePrefix["name"];
            }

            var requestedNumberOfSamples = get_stage_inputs_by_ref("number_of_samples");

            if ($.isEmptyObject(requestedNumberOfSamples)) {
                requestedNumberOfSamples = 0;
            } else {
                requestedNumberOfSamples = requestedNumberOfSamples["number_of_samples"];
            }

            requestedNumberOfSamples = parseInt(requestedNumberOfSamples);

            //set up data source
            var dtd = [];

            if (generatedSamples.length == 0) {
                //no sample generated. auto generate samples based on description metadata

                var newNames = generate_sample_names(1, requestedNumberOfSamples, namePrefix);


                for (var i = 0; i < newNames.length; ++i) {
                    var option = {};
                    option["name"] = newNames[i];
                    option["attributes"] = initialSampleAttributes;
                    generatedSamples.push(option);
                }

                $.each(generatedSamples, function (key, val) {
                    var option = {};
                    option["rank"] = key + 1;
                    option["name"] = val.name;
                    option["attributes"] = val.attributes;
                    set_dynamic_attributes(option);
                    dtd.push(option);
                });
            } else if (requestedNumberOfSamples > generatedSamples.length) {
                var newNames = generate_sample_names((generatedSamples.length + 1), (requestedNumberOfSamples - generatedSamples.length ), namePrefix);

                for (var i = 0; i < newNames.length; ++i) {
                    var option = {};
                    option["name"] = newNames[i];
                    option["attributes"] = initialSampleAttributes;
                    generatedSamples.push(option);
                }

                $.each(generatedSamples, function (key, val) {
                    var option = {};
                    option["rank"] = key + 1;
                    option["name"] = val.name;
                    option["attributes"] = val.attributes;
                    set_dynamic_attributes(option);
                    dtd.push(option);
                });
            } else if (requestedNumberOfSamples < generatedSamples.length) {
                var tempGenerated = [];
                for (var i = 0; i < requestedNumberOfSamples; ++i) {
                    tempGenerated.push(generatedSamples[i]);

                }

                generatedSamples = tempGenerated;

                $.each(generatedSamples, function (key, val) {
                    var option = {};
                    option["rank"] = key + 1;
                    option["name"] = val.name;
                    option["attributes"] = val.attributes;
                    set_dynamic_attributes(option);
                    dtd.push(option);
                });
            } else if (requestedNumberOfSamples == generatedSamples.length) {
                return false;
            }


            //set data

            var table = null;
            if ($.fn.dataTable.isDataTable('#generated_samples_table')) {
                //if table instance already exists, then do refresh
                table = $('#generated_samples_table').DataTable();
            }

            if (table) {
                //clear old, set new data
                table
                    .clear()
                    .draw();
                table
                    .rows
                    .add(dtd);
                table
                    .columns
                    .adjust()
                    .draw();
                table
                    .search('')
                    .columns()
                    .search('')
                    .draw();
            } else {
                //first set static columns...
                var setColumns = [
                    {
                        "data": "rank",
                        "visible": false
                    },
                    {
                        "data": "name",
                        "title": "Sample Name"
                    },
                    {
                        "data": "attributes",
                        "visible": false
                    }
                ]

                //set the dynamic columns, which are based on user's input
                setColumns = setColumns.concat(set_dynamic_columns());


                table = $('#generated_samples_table').DataTable({
                    data: dtd,
                    "dom": '<"top"if>rt<"bottom"lp><"clear">',
                    select: {
                        style: 'multi'
                    },
                    language: {
                        "info": " _START_ to _END_ of _TOTAL_ samples",
                        "lengthMenu": "Show _MENU_ samples",
                    },
                    order: [[0, "asc"]],
                    columns: setColumns,
                    "columnDefs": [
                        {"orderData": 0,}
                    ],
                    keys: {
                        //columns: ':not(:first-child)',
                        keys: [9, 13, 37, 39, 38, 40],
                        blurable: false
                    },
                });

                table
                // .on('key-focus', function (e, datatable, cell) {
                //     alert(cell.data());
                // })
                    .on('key', function (e, datatable, key, cell, originalEvent) {
                        if (key == 13) {//trap enter key for editing a cell

                            //bypass static cells edit; these are the first 3 cells in a row
                            if (cell.index().column < 3) {
                                return false;
                            }

                            var rowData = datatable.row(cell.index().row).data();
                            // console.log(rowData);
                            // console.log(cell.data());
                            var node = cell.node();

                            if ($(node).find(".cell-dynamic-element").length) {
                                return false;
                            }

                            table.keys.disable();

                            var formElem = cell.data();
                            var control = formElem.control;
                            if (formElem.hidden == "true") {
                                control = "hidden";
                            }
                            var elemValue = null;

                            var htmlCtrl = dispatchFormControl[controlsMapping[control.toLowerCase()]](formElem, elemValue);
                            htmlCtrl.find("label").remove();

                            var cellEditPanel = $(".cell-edit-panel").clone().css("display", "block").find(".panel");
                            cellEditPanel.find(".panel-body").append(htmlCtrl);

                            $(node)
                                .html('')
                                .append(cellEditPanel)
                                .find(".input-copo").focus();

                            cellEditPanel.find(".cell-apply").keypress(function (evt) {
                                if (evt.which == 13) {
                                    //add call to save here...
                                    table.keys.enable();
                                }
                            });

                            cellEditPanel.find(".cell-apply").click(function () {
                                //add call to save here...
                                table.keys.enable();
                            });

                            refresh_tool_tips();
                        }
                    })
                    .on('key-blur', function (e, datatable, cell) {
                        //get row data
                        var rowData = datatable.row(cell.index().row).data();
                        var node = cell.node();
                        if ($(node).find(".cell-dynamic-element").length) {
                            $(node).html('fixing your value soon!');
                        }
                    });
            }

        }//end of func

        function set_dynamic_columns() {
            var setColumns = [];


            //get attributes schema used in building the sample_attributes form
            var sampleAttributes = Object();
            for (var i = 0; i < negotiatedStages.length; ++i) {
                if (negotiatedStages[i].ref == "sample_attributes") {
                    sampleAttributes = negotiatedStages[i];
                    break;
                }
            }

            if (!$.isEmptyObject(sampleAttributes)) {
                for (var i = 0; i < sampleAttributes.items.length; ++i) {
                    var currentItem = sampleAttributes.items[i];
                    if (currentItem.hasOwnProperty("show_in_form") && currentItem["show_in_form"]) {
                        if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() == "false") {

                            if (currentItem.type == "array") {
                                ;
                            } else {
                                var col = {
                                    "data": currentItem.id,
                                    "title": currentItem.label,
                                    "render": function (data, type, row, meta) {
                                        return $('<div></div>').append(get_item_value(data, row.attributes)).html();
                                    }
                                }
                                setColumns.push(col);
                            }//end item not array
                        }
                    }
                }
            }

            return setColumns;
        }

        function set_dynamic_attributes(option) {
            //get attributes schema used in building the sample_attributes form
            var sampleAttributes = Object();
            for (var i = 0; i < negotiatedStages.length; ++i) {
                if (negotiatedStages[i].ref == "sample_attributes") {
                    sampleAttributes = negotiatedStages[i];
                    break;
                }
            }

            if (!$.isEmptyObject(sampleAttributes)) {
                for (var i = 0; i < sampleAttributes.items.length; ++i) {
                    var currentItem = sampleAttributes.items[i];
                    if (currentItem.hasOwnProperty("show_in_form") && currentItem["show_in_form"]) {
                        if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() == "false") {
                            if (currentItem.type == "array") {
                                ;
                            } else {
                                option[currentItem.id] = currentItem;
                            }
                        }
                    }
                }
            }
        }

        function get_row_attributes(elem) {
            var table = $('#generated_samples_table').DataTable();
            var tr = elem.closest('tr');
            var row = table.row(tr);

            if (row.child.isShown()) {
                // This row is already open - close it
                row.child('');
                row.child.hide();
                tr.removeClass('shown');

                elem.closest('tr').find(".sample-view-button").html('<i class="fa fa-plus-circle"></i> ');
            }
            else {
                //build view
                var attributesPanel = $('<div/>', {
                    class: "panel panel-copo-data panel-primary",
                    style: "margin-top: 5px; font-size: 12px;"
                });

                var attributesPanelHeading = $('<div/>', {
                    class: "panel-heading",
                    style: "background-image: none;",
                    html: "Sample Attributes"
                });

                attributesPanel.append(attributesPanelHeading);


                var attributesPanelBody = $('<div/>', {
                    class: "panel-body"
                });

                var notAssignedSpan = $('<span/>', {
                    class: "text-danger",
                    html: "Attributes not assigned!"
                });

                attributesPanelBody.append(notAssignedSpan);

                //get values
                var stageValueObject = generatedSamples[parseInt(elem.attr("data-row-indx"))].attributes;

                //get stage
                var targetStage = Object();
                for (var i = 0; i < negotiatedStages.length; ++i) {
                    if (negotiatedStages[i].ref == "sample_attributes") {
                        targetStage = negotiatedStages[i];
                        break;
                    }
                }

                if (!($.isEmptyObject(stageValueObject) || $.isEmptyObject(targetStage))) {
                    //clear panel for new information
                    attributesPanelBody.html('');

                    for (var i = 0; i < targetStage.items.length; ++i) {
                        var currentItem = targetStage.items[i];
                        if (currentItem.hasOwnProperty("show_in_form") && currentItem["show_in_form"]) {
                            if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() == "false") {

                                var itemLabel = $('<div/>', {
                                    // for: currentItem.id,
                                    html: currentItem.label,
                                    style: "font-size:12px; font-weight:bold"
                                });

                                var itemDiv = $('<div/>', {
                                    style: "padding: 5px; border: 1px solid #ddd; border-radius:2px; margin-bottom:3px;"
                                }).append(itemLabel).append(get_item_value(currentItem, stageValueObject));

                                attributesPanelBody.append(itemDiv);

                            }
                        }
                    }
                }


                attributesPanel.append(attributesPanelBody);

                var ctrlDiv = $('<div/>').append(attributesPanel);


                //add view
                row.child(ctrlDiv.html()).show();
                tr.addClass('shown');

                elem.closest('tr').find(".sample-view-button").html('<i class="fa fa-minus-circle"></i> ');
            }
        }


        function get_item_value_2(item, record) {
            //sort out item value

            var itemValue = $('<div/>',
                {
                    class: "ctrlDIV"
                });

            var valObject = record[item.id];

            if (item.type == "array") {
                //group items based on similarity of suffix

                for (var i = 0; i < valObject.length; ++i) {

                    try {
                        var objectHTML = dispatchViewControl[controlsViewMapping[item.control.toLowerCase()]](valObject[i], item);
                        itemValue.append(objectHTML);
                    }
                    catch (err) {
                        console.log(err + item.control);
                    }
                }

            } else {
                try {
                    var objectHTML = dispatchViewControl[controlsViewMapping[item.control.toLowerCase()]](valObject, item);
                    itemValue.append(objectHTML);
                }
                catch (err) {
                    console.log(err + item.control);
                }
            }

            return itemValue;
        }


        function get_item_value(item, valuesObject) {
            //sort out item value
            var itemValue = $('<div/>',
                {
                    class: "ctrlDIV"
                });

            //get base of ids
            var relevantList = Object();
            var totalRelevant = 0;

            $.each(valuesObject, function (key, val) {
                if (key.split(".").slice(0)[0] == item.id) {
                    ++totalRelevant;
                    relevantList[key] = val;
                }
            });

            if (item.type == "array") {
                //group items based on similarity of suffix
                var groupedList = [];

                //get first element group (without suffix)var groupbyIndx = Object();
                var groupbyIndx = Object();
                $.each(relevantList, function (key, val) {
                    if (isNaN(key.split("_").slice(-1)[0])) {
                        groupbyIndx[key] = val;
                    }
                });

                if (!($.isEmptyObject(groupbyIndx))) {
                    groupedList.push(groupbyIndx);
                }

                //now get other groups
                for (var i = 1; i < totalRelevant; ++i) {
                    var groupbyIndx = Object();

                    $.each(relevantList, function (key, val) {
                        if (parseInt(key.split("_").slice(-1)[0]) == i) {
                            groupbyIndx[key.split("_").slice(0)[0]] = val;
                        }
                    });

                    if (!($.isEmptyObject(groupbyIndx))) {
                        groupedList.push(groupbyIndx);
                    }

                }

                for (var i = 0; i < groupedList.length; ++i) {
                    var objectHTML = dispatchFormDataControl[controlsDataMapping[item.control.toLowerCase()]](groupedList[i], item);
                    itemValue.append(objectHTML);
                }

            } else {
                var objectHTML = dispatchFormDataControl[controlsDataMapping[item.control.toLowerCase()]](relevantList, item);
                itemValue.append(objectHTML);
            }

            return itemValue;
        }

        var controlsViewMapping = {
            "text": "do_text_ctrl",
            "textarea": "do_textarea_ctrl",
            "hidden": "do_hidden_ctrl",
            "copo-select": "do_copo_select_ctrl",
            "ontology term": "do_ontology_term_ctrl",
            "select": "do_select_ctrl",
            "copo-multi-search": "do_copo_multi_search_ctrl",
            "copo-multi-select": "do_copo_multi_select_ctrl",
            "copo-comment": "do_copo_comment_ctrl",
            "copo-characteristics": "do_copo_characteristics_ctrl",
            "copo-sample-source-2": "do_copo_sample_source_ctrl_2",
            "oauth_required": "do_oauth_required",
            "copo-button-list": "do_copo_button_list_ctrl",
            "copo-item-count": "do_copo_item_count_ctrl"
        };


        var dispatchViewControl = {
            do_text_ctrl: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                ctrlsDiv.append(get_attributes_inner_div_1().append(relevantObject));

                return ctrlsDiv;
            },
            do_textarea_ctrl: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                ctrlsDiv.append(get_attributes_inner_div_1().append(relevantObject));

                return ctrlsDiv;
            },
            do_copo_select_ctrl: function (relevantObject, item) {
                return Object();
            },
            do_select_ctrl: function (relevantObject, item) {
                return Object();
            },
            do_copo_multi_search_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_multi_select_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_sample_source_ctrl_2: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                try {
                    var theValueObject = item.option_values;

                    for (var j = 0; j < theValueObject.options.length; ++j) {
                        if (relevantObject == theValueObject.options[j][theValueObject.value_field]) {
                            ctrlsDiv.append(get_attributes_inner_div_1().append(theValueObject.options[j][theValueObject.label_field]));
                        }
                    }
                }
                catch (err) {
                    console.log(err.name);
                }


                return ctrlsDiv;
            },
            do_copo_button_list_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_item_count_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_characteristics_ctrl: function (relevantObject, item) {
                var characteristicsSchema = copoSchemas.characteristics_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < characteristicsSchema.length; ++i) {

                    var currentItem = characteristicsSchema[i];

                    if (!currentItem.hasOwnProperty("show_in_table") || !currentItem["show_in_table"]) {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    var subValObject = Object();

                    if (relevantObject.hasOwnProperty(scID)) {
                        subValObject = relevantObject[scID];
                    }

                    $.each(subValObject, function (key, val) {
                        if (key == "annotationValue") {

                            if (val == "") {
                                val = "-"
                            }

                            if (i == 0) {
                                ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                            } else {
                                ctrlsDiv.append(get_attributes_inner_div().append(val));
                            }
                        }
                    });

                }

                return ctrlsDiv;
            },
            do_copo_comment_ctrl: function (relevantObject, item) {
                var commentSchema = copoSchemas.comment_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < commentSchema.length; ++i) {

                    var currentItem = commentSchema[i];

                    if (!currentItem.hasOwnProperty("show_in_table") || !currentItem["show_in_table"]) {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    var val = "";
                    if (relevantObject.hasOwnProperty(scID)) {
                        val = relevantObject[scID];

                        if (val == "") {
                            val = "-"
                        }

                        if (i == 0) {
                            ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                        } else {
                            ctrlsDiv.append(get_attributes_inner_div().append(val));
                        }
                    }

                }

                return ctrlsDiv;
            },
            do_ontology_term_ctrl: function (relevantObject, item) {
                var ontologySchema = copoSchemas.ontology_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < ontologySchema.length; ++i) {

                    var currentItem = ontologySchema[i];

                    if (!currentItem.hasOwnProperty("show_in_table") || !currentItem["show_in_table"]) {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    var val = "";
                    if (relevantObject.hasOwnProperty(scID)) {
                        val = relevantObject[scID];

                        if (val == "") {
                            val = "-"
                        }

                        if (i == 0) {
                            ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                        } else {
                            ctrlsDiv.append(get_attributes_inner_div().append(val));
                        }
                    }

                }

                return ctrlsDiv;

            }
        };


        var controlsDataMapping = {
            "text": "do_text_ctrl",
            "textarea": "do_textarea_ctrl",
            "hidden": "do_hidden_ctrl",
            "copo-select": "do_copo_select_ctrl",
            "ontology term": "do_ontology_term_ctrl",
            "select": "do_select_ctrl",
            "copo-multi-search": "do_copo_multi_search_ctrl",
            "copo-multi-select": "do_copo_multi_select_ctrl",
            "copo-comment": "do_copo_comment_ctrl",
            "copo-characteristics": "do_copo_characteristics_ctrl",
            "copo-sample-source-2": "do_copo_sample_source_ctrl_2",
            "oauth_required": "do_oauth_required",
            "copo-button-list": "do_copo_button_list_ctrl",
            "copo-item-count": "do_copo_item_count_ctrl"
        };


        var dispatchFormDataControl = {
            do_text_ctrl: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                ctrlsDiv.append(get_attributes_inner_div_1().append(relevantObject[item.id]));

                return ctrlsDiv;
            },
            do_textarea_ctrl: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                ctrlsDiv.append(get_attributes_inner_div_1().append(relevantObject[item.id]));

                return ctrlsDiv;
            },
            do_copo_select_ctrl: function (relevantObject, item) {
                return "";
            },
            do_select_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_multi_search_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_multi_select_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_sample_source_ctrl_2: function (relevantObject, item) {
                var ctrlsDiv = get_attributes_outer_div();

                try {
                    var theValueObject = JSON.parse($("#" + item.id).parent().find(".elem-json").val());
                    var theData = (relevantObject[item.id]).split(",");

                    for (var i = 0; i < theData.length; ++i) {
                        for (var j = 0; j < theValueObject.options.length; ++j) {
                            if (theData[i] == theValueObject.options[j][theValueObject.value_field]) {
                                ctrlsDiv.append(get_attributes_inner_div_1().append(theValueObject.options[j][theValueObject.label_field]));
                            }
                        }
                    }
                }
                catch (err) {
                    console.log(err.name);
                }


                return ctrlsDiv;
            },
            do_copo_button_list_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_item_count_ctrl: function (relevantObject, item) {
                return "";
            },
            do_copo_characteristics_ctrl: function (relevantObject, item) {
                var characteristicsSchema = copoSchemas.characteristics_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < characteristicsSchema.length; ++i) {

                    var currentItem = characteristicsSchema[i];

                    if (!currentItem.hasOwnProperty("show_in_form") || !currentItem["show_in_form"]) {
                        continue;
                    }

                    if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() != "false") {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    $.each(relevantObject, function (key, val) {
                        if (key.split('.')[1] == scID && key.split(".").slice(-1)[0] == "annotationValue") {

                            if (val == "") {
                                val = "-"
                            }

                            if (i == 0) {
                                ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                            } else {
                                ctrlsDiv.append(get_attributes_inner_div().append(val));
                            }
                        }
                    });

                }

                return ctrlsDiv;
            },
            do_copo_comment_ctrl: function (relevantObject, item) {
                var commentSchema = copoSchemas.comment_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < commentSchema.length; ++i) {

                    var currentItem = commentSchema[i];

                    if (!currentItem.hasOwnProperty("show_in_form") || !currentItem["show_in_form"]) {
                        continue;
                    }

                    if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() != "false") {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    $.each(relevantObject, function (key, val) {
                        if (key.split('.')[1] == scID) {

                            if (val == "") {
                                val = "-"
                            }

                            if (i == 0) {
                                ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                            } else {
                                ctrlsDiv.append(get_attributes_inner_div().append(val));
                            }

                        }
                    });

                }

                return ctrlsDiv;
            },
            do_ontology_term_ctrl: function (relevantObject, item) {
                var ontologySchema = copoSchemas.ontology_schema;

                var ctrlsDiv = get_attributes_outer_div();

                for (var i = 0; i < ontologySchema.length; ++i) {

                    var currentItem = ontologySchema[i];

                    if (!currentItem.hasOwnProperty("show_in_form") || !currentItem["show_in_form"]) {
                        continue;
                    }
                    if (currentItem.hasOwnProperty("hidden") && currentItem.hidden.toString() != "false") {
                        continue;
                    }

                    var scID = currentItem.id.split(".").slice(-1)[0];
                    $.each(relevantObject, function (key, val) {
                        if (key.split('.')[1] == scID) {

                            if (val == "") {
                                val = "-"
                            }

                            if (i == 0) {
                                ctrlsDiv.append(get_attributes_inner_div_1().append(val));
                            } else {
                                ctrlsDiv.append(get_attributes_inner_div().append(val));
                            }
                        }
                    });

                }

                return ctrlsDiv;

            }
        };


        function get_stage_inputs_by_ref(ref) {
            var form_values = Object();

            if (stagesFormValues.hasOwnProperty(ref)) {
                form_values = stagesFormValues[ref];
            }

            return form_values;

        }


        function generate_sample_names(startIndx, number_to_generate, namePrefix) {
            var generatedNames = [];

            var combinedName = namePrefix + "_" + Math.round(new Date().getTime() / 1000);

            startIndx = parseInt(startIndx);
            number_to_generate = parseInt(number_to_generate);

            for (var i = startIndx; i < (number_to_generate + startIndx); ++i) {
                generatedNames.push(combinedName + "_" + i);
            }

            return generatedNames;
        }


        function dialog_display(dialog, dTitle, dMessage, dType) {
            var dTypeObject = {
                "warning": "fa fa-exclamation-circle copo-icon-warning",
                "danger": "fa fa-times-circle copo-icon-danger",
                "info": "fa fa-exclamation-circle copo-icon-info"
            };

            var dTypeClass = "fa fa-exclamation-circle copo-icon-default";

            if (dTypeObject.hasOwnProperty(dType)) {
                dTypeClass = dTypeObject[dType];
            }

            var iconElement = $('<div/>', {
                class: dTypeClass + " wizard-alert-icon"
            });


            var $dialogContent = $('<div></div>');
            $dialogContent.append($('<div/>').append(iconElement));
            $dialogContent.append('<div class="copo-custom-modal-message">' + dMessage + '</div>');
            dialog.realize();
            dialog.setClosable(false);
            dialog.setSize(BootstrapDialog.SIZE_NORMAL);
            dialog.getModalHeader().hide();
            dialog.setTitle(dTitle);
            dialog.setMessage($dialogContent);
            dialog.getModalBody().prepend('<div class="copo-custom-modal-title">' + dialog.getTitle() + '</div>');
            dialog.getModalBody().addClass('copo-custom-modal-body');
            //dialog.getModalContent().css('border', '4px solid rgba(255, 255, 255, 0.3)');
            dialog.open();
        }


        function set_samples_how_tos(component) {

            if (!sampleHowtos.hasOwnProperty(component)) {
                component = "generalHelpTips"; //general help tips
            }


            var dataSet = []; //sampleHowtos[component].properties;

            $.each(sampleHowtos[component].properties, function (key, val) {
                var option = {};
                option["rank"] = key + 1;
                option["title"] = val.title;
                option["content"] = val.content;
                dataSet.push(option);
            });


            //set data
            var table = null;

            if ($.fn.dataTable.isDataTable('#datafile_howtos')) {
                //if table instance already exists, then do refresh
                table = $('#datafile_howtos').DataTable();
            }

            if (table) {
                //clear old, set new data
                table
                    .clear()
                    .draw();
                table
                    .rows
                    .add(dataSet);
                table
                    .columns
                    .adjust()
                    .draw();
                table
                    .search('')
                    .columns()
                    .search('')
                    .draw();
            } else {
                table = $('#datafile_howtos').DataTable({
                    data: dataSet,
                    searchHighlight: true,
                    "lengthChange": false,
                    order: [[0, "asc"]],
                    language: {
                        "info": " _START_ to _END_ of _TOTAL_ help tips",
                        "lengthMenu": "_MENU_ tips",
                    },
                    columns: [
                        {
                            "data": "rank",
                            "visible": false
                        },
                        {
                            "data": null,
                            "title": "Tips",
                            "render": function (data, type, row, meta) {
                                var aLink = $('<a/>', {
                                    "data-toggle": "collapse",
                                    href: "#helpcentretips" + meta.row,
                                    html: data.title
                                });

                                var aDiv = $('<div/>', {
                                    "class": "collapse help-centre-content",
                                    id: "helpcentretips" + meta.row,
                                    html: data.content,
                                    style: "background-color: #fff; margin-top: 10px; border-radius: 4px;"
                                });
                                return $('<div></div>').append(aLink).append(aDiv).html();
                            }
                        },
                        {
                            "data": "content",
                            "visible": false
                        }
                    ],
                    "columnDefs": [
                        {"orderData": 0,}
                    ]
                });
            }

            $('#datafile_howtos tr:eq(0) th:eq(0)').text(sampleHowtos[component].title + " Tips");
        }

    }
)//end document ready