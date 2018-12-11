var submissionIDS = [];
var intervalIsSet = false; //flag to start polling for information
$(document).ready(function () {

    // test starts
    // test ends
    //******************************Event Handlers Block*************************//
    var component = "submission";

    var copoFormsURL = "/copo/copo_forms/";
    var copoVisualsURL = "/copo/copo_visualize/";
    var csrftoken = $.cookie('csrftoken');

    var componentMeta = get_component_meta(component);


    //load work profiles
    var tableLoader = $('<div class="copo-i-loader"></div>');
    $("#component_table_loader").append(tableLoader);

    sanitise_submissions(); //enables update of new meta fields before loading submission
    load_submissions();

    // handle/attach events to table buttons
    $('body').on('addbuttonevents', function (event) {
        do_record_task(event);
    });

    $(document).on('click', '#publish_dataset', function (event) {
        e = $(event.currentTarget)
        sub_id = $(e).data('submission_id')
        $.ajax({
            url: "/copo/dataverse_publish/",
            type: "POST",
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                'sub_id': sub_id
            },
            success: function (data) {
                console.log(data)
            },
            error: function (data) {
                console.log(data)
            }
        });
    })

    $(document).on('click', '.target_repo_option', function (event) {
        event.preventDefault()
        var e = event.currentTarget
        $('#custom_repo_id').val(e.innerHTML)
        var text = $(e).html()
        $(e).closest($('#target_repo_label').html(text))
        var submission_id = $(e).data('submission_id')

        $.ajax({
            url: "/copo/update_submission_repo_data/",
            type: "POST",
            dataType: "json",
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                'task': 'change_destination',
                'custom_repo_id': $(e).data('repoId'),
                'submission_id': submission_id,
            },
            success: function (data) {
                $('#view_repo_structure_' + data.record_id).removeClass('disabled').addClass('enabled')
                $('#submission_control_' + data.record_id).children('.disabled').removeClass('disabled').addClass('enabled')
                $('#submission_firstcol_' + submission_id).find('.badge').html('')
                $('#target_repo_label_' + submission_id).html(data.url)
            },
            error: function () {
            }
        });

    })

    refresh_tool_tips();

    //******************************Functions Block******************************//
    function do_render_submission_table(d) {
        var dtd = d.table_data.dataSet;
        var repos = d.table_data.repos;
        set_empty_component_message(dtd.length); //display empty submission message.

        if (dtd.length == 0) {
            return false;
        }

        var tableID = componentMeta.tableID;

        var dataSet = [];

        for (var i = 0; i < dtd.length; ++i) {
            var data = dtd[i];

            //get submission id
            var record_id = '';
            if (data.hasOwnProperty("record_id")) {
                record_id = data.record_id;
                submissionIDS.push(record_id);
            }


            //get repository
            var repository = '';
            if (data.hasOwnProperty("repository")) {
                repository = data.repository;
            }

            //get complete status
            var complete = 'false';
            if (data.hasOwnProperty("complete")) {
                complete = data.complete;
            }

            //get published status
            var published = 'false';
            if (data.hasOwnProperty("published")) {
                published = data.published;
            }

            //get bundle
            var bundle = [];
            if (data.hasOwnProperty("bundle")) {
                bundle = data.bundle;
            }

            // get repo info
            var meta = undefined
            if (data.hasOwnProperty('meta')) {
                meta = data['meta']
            }

            var destination_repo = undefined
            if (data.hasOwnProperty('destination_repo')) {
                if (data.destination_repo) {
                    if (typeof(data.destination_repo == 'object')) {
                        if (Object.keys(data.destination_repo).length > 0) {
                            destination_repo = data.destination_repo
                        }
                    }
                }
            }

            var accessions = undefined
            if (data.hasOwnProperty('accessions')) {
                accessions = data.accessions
            }

            //get bundle_meta
            var bundle_meta = [];
            if (data.hasOwnProperty("bundle_meta")) {
                bundle_meta = data.bundle_meta;
            }

            //get date
            var date_created = '';
            if (data.hasOwnProperty("date_created")) {
                date_created = data.date_created;
            }

            //get status
            var status = '';
            if (data.hasOwnProperty("complete")) {
                status = data.complete.toString().toLowerCase();
            }

            //get special repositories
            var special_repositories = '';
            if (data.hasOwnProperty("special_repositories")) {
                special_repositories = data.special_repositories.toString().toLowerCase();
            }

            if (record_id) {
                var option = {};
                option["accessions"] = accessions;
                option["meta"] = meta;
                option["destination_repo"] = destination_repo
                option["repository"] = repository;
                option["status"] = status;
                option["bundle"] = bundle;
                option["bundle_meta"] = bundle_meta;
                option["date_created"] = date_created;
                option["record_id"] = record_id;
                option["special_repositories"] = special_repositories;
                option["complete"] = complete
                option["published"] = published

                dataSet.push(option);
            }
        }


        //set data
        var table = null;

        if ($.fn.dataTable.isDataTable('#' + tableID)) {
            //if table instance already exists, then do refresh
            table = $('#' + tableID).DataTable();
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
            table = $('#' + tableID).DataTable({
                    data: dataSet,
                    searchHighlight: true,
                    ordering: true,
                    lengthChange: true,
                    buttons: [
                        'selectAll',
                        'selectNone'
                    ],
                    select: {
                        style: 'multi', //os, multi, api
                        items: 'row' //row, cell, column
                    },
                    language: {
                        "info": "Showing _START_ to _END_ of _TOTAL_ submissions",
                        "search": " ",
                        //"lengthMenu": "show _MENU_ records",
                        buttons: {
                            selectAll: "Select all",
                            selectNone: "Select none",
                        }
                    },
                    order: [
                        [2, "desc"]
                    ],
                    columns: [
                        {
                            "data": null,
                            "orderable": false,
                            "render": function (data) {


                                var renderHTML = $(".datatables3-panel-template")
                                    .clone()
                                    .removeClass("datatables3-panel-template")
                                    .addClass("copo-records-panel");

                                //set heading
                                renderHTML.find(".panel-heading").find(".row-title").html('<span>' + data.repository + '</span>');


                                //set body
                                var bodyRow = $('<div class="row" style="margin-bottom: 10px;"></div>');

                                var colsFirstHTML = $('<div class="col-sm-6 col-md-6 col-lg-6" id="submission_firstcol_' + data.record_id + '"></div>')
                                    .append('<div>Created:</div>')
                                    .append('<div style="margin-bottom: 10px;">' + data.date_created + '</div>')
                                    .append('<div class="firstcol-completed1" style="display: none;">Completed:</div>')
                                    .append('<div class="firstcol-completed2" style="margin-bottom: 10px; display: none;"></div>')

                                var repo_selected = false
                                if (data.destination_repo != undefined) {
                                    repo_selected = true;
                                }

                                if (data.complete == 'true') {
                                    if (data.special_repositories == 'dataverse') {
                                        // add publish button to table if complete
                                        colsFirstHTML.append('<button style="margin-left: 5px"  data-submission_id="' + data.record_id + '" class="btn btn-default" type="button" id="publish_dataset">Publish</button>')
                                    }
                                    else {
                                        ;
                                    }
                                } else {
                                    if (jQuery.isEmptyObject(data.destination_repo)) {
                                        colsFirstHTML.append('<div>Target Repository:' + '<span style="font-weight: bolder; margin: 5px 0 5px 5px" id="target_repo_label_' + data.record_id + '" style="margin-bottom: 10px;"></span></div>')
                                    }
                                    else {
                                        colsFirstHTML.append('<div>Target Repository:' + '<span style="font-weight: bolder; margin: 5px 0 5px 5px" id="target_repo_label_' + data.record_id + '" style="margin-bottom: 10px;">' + data.destination_repo.url + '</span></div>')
                                    }

                                    if (data.special_repositories == 'dcterms' || data.special_repositories == 'ckan' || data.special_repositories == 'dataverse' || data.special_repositories == 'dspace') {

                                        if (repos.length) {

                                            /*if data has repos attached then this user has permission to submit to one or more
                                            institutional repos, so add them into a dropdown here*/

                                            colsFirstHTML.append('<div id="target_repo_dropdown" class="dropdown">')
                                                .append('<button class="btn btn-default dropdown-toggle" type="button" id="target_repo_option_button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">Choose Repository<span class="caret"></span></button>')

                                            var ul = $('<ul class="dropdown-menu" aria-labelledby="">')
                                            var li_default = $('<li><a data-repo-id="default" data-submission_id="' + data.record_id + '" class="target_repo_option" href="#">Default ' + data.repository + '</a></li>')
                                            ul.append(li_default)
                                            for (r in repos) {
                                                row = repos[r]
                                                var li = $('<li><a data-repo-id="' + row._id + '" data-submission_id="' + data.record_id + '" class="target_repo_option" href="#">' + row.name + ' - ' + row.url + '</a></li>')
                                                ul.append(li)
                                            }
                                            colsFirstHTML.append(ul)
                                        }
                                        if (data.complete != true) {
                                            if (repo_selected == true) {
                                                colsFirstHTML.append('<button style="margin-left: 5px" data-toggle="modal" data-submission_id="' + data.record_id + '" data-target="#repo_modal" class="btn btn-default" type="button" id="view_repo_structure_' + data.record_id + '">Inspect Repository</button>')
                                            }
                                            else {
                                                colsFirstHTML.append('<button style="margin-left: 5px" data-toggle="modal" data-submission_id="' + data.record_id + '" data-target="#repo_modal" class="btn btn-default disabled" type="button" id="view_repo_structure_' + data.record_id + '">Inspect Repository</button>')

                                            }
                                        }

                                        if (data.accessions == undefined) {
                                            ;
                                        } else if (!jQuery.isEmptyObject(data.meta) && $(data.meta)[0].hasOwnProperty('identifier')) {
                                            if (data.destination_repo['type'] == 'dspace') {
                                                colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to Dataset: <span class="badge">' + data.meta.identifier + ' - ' + data.meta.dspace_item_name + '</span></div>')
                                            } else if (data.destination_repo['type'] == 'dataverse') {
                                                colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to Dataset: <span class="badge">' + data.meta.identifier + ' - ' + data.meta.doi + '</span></div>')
                                            } else if (data.destination_repo['type'] == 'ckan') {
                                                colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to CKAN Package: <span class="badge">' + data.meta.identifier + '</span></div>')
                                            }
                                        }
                                        else {
                                            colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Choose Submission Target</span></div>')
                                        }
                                    }

                                }


                                var colsThirdHTML = $('<div class="col-sm-2 col-md-2 col-lg-2" style="padding-left: 2px; margin-left: -50px;"></div>')
                                    .append('<div data-repo-selected="' + repo_selected + '" class="pull-right" id="submission_control_' + data.record_id + '"></div>');


                                // set submission status
                                var colsSecondHTML = $('<div class="col-sm-4 col-md-4 col-lg-4" style="padding-right: 2px; margin-left: 50px;"></div>')
                                    .append($(".submission-progess-wrapper").clone().attr("id", "submission_progress_" + data.record_id));

                                $(colsThirdHTML).attr('data-repo-selected', repo_selected);

                                bodyRow.append(colsFirstHTML);
                                bodyRow.append(colsSecondHTML);
                                bodyRow.append(colsThirdHTML);


                                //set datafiles bundle
                                var bundleRow = $('<div class="row"></div>');
                                var bundleCol = $('<div class="col-sm-12 col-md-12 col-lg-12"></div>')
                                bundleCol.append('<table id="submission_bundle_table_' + data.record_id + '" class="ui celled stripe table hover copo-noborders-table" cellspacing="0" width="100%"></table>');
                                bundleRow.append(bundleCol);

                                renderHTML.find(".panel-body")
                                    .html('')
                                    .append(bodyRow)
                                    .append(bundleRow);

                                return $('<div/>').append(renderHTML).html();
                            }
                        },
                        {
                            "data":
                                "repository",
                            "title":
                                "Repository",
                            "visible":
                                false
                        }
                        ,
                        {
                            "data":
                                "date_created",
                            "title":
                                "Created",
                            "visible":
                                false
                        }
                        ,
                        {
                            "data":
                                "status",
                            "visible":
                                false
                        }
                        ,
                        {
                            "data":
                                "record_id",
                            "visible":
                                false
                        }
                    ],
                    "columnDefs":
                        [],
                    fnDrawCallback:

                        function () {
                            dataSet.forEach(function (item) {
                                get_submission_bundle_table(item);
                            });

                            refresh_tool_tips();
                            get_submission_information();
                        }

                    ,
                    dom: 'Bfr<"row"><"row info-rw" i>tlp',
                }
            );

            table
                .buttons()
                .nodes()
                .each(function (value) {
                    $(this)
                        .removeClass("btn btn-default")
                        .addClass('tiny ui basic button');
                });

            place_task_buttons(componentMeta); //this will place custom buttons on the table for executing tasks on records
        }

        $('#' + tableID + '_filter')
            .find("input")
            .removeClass("input-sm")
            .attr("placeholder", "Search Submissions")
            .attr("size", 30);


        if (table) {
            table.on('select', function (e, dt, type, indexes) {
                set_selected_rows(dt);
            });

            table.on('deselect', function (e, dt, type, indexes) {
                set_selected_rows(dt);
            });
        }

    }

    function set_selected_rows(dt) {
        var tableID = dt.table().node().id;

        var selected_records = [];
        $.map(dt.rows('.selected').data(), function (item) {
            selected_records.push(item);
        });

        $('#' + tableID + ' > tbody > tr').each(function () {
            $(this).find(".panel:first").find(".row-select-icon").children('i').eq(0).removeClass("fa fa-check-square-o");
            $(this).find(".panel:first").find(".row-select-icon").children('i').eq(0).addClass("fa fa-square-o");

            if ($(this).hasClass('selected')) {
                $(this).find(".panel:first").find(".row-select-icon").children('i').eq(0).removeClass("fa fa-square-o");
                $(this).find(".panel:first").find(".row-select-icon").children('i').eq(0).addClass("fa fa-check-square-o");
            }
        });
    }

    function get_submission_bundle_table(submissionRecord) {
        var bundle = submissionRecord["bundle"];
        //set up data source
        var dtd = [];
        for (var i = 0; i < bundle.length; ++i) {
            var item = bundle[i];

            var option = {};
            option.target_label = item.recordLabel;
            option.target_id = item.recordID;
            option.target_status = '';
            dtd.push(option);
        }

        var tableID = 'submission_bundle_table_' + submissionRecord.record_id;

        if ($.fn.dataTable.isDataTable('#' + tableID)) {
            //if table instance already exists, then destroy in order to successfully re-initialise
            $('#' + tableID).destroy();
        }

        var subTable = $('#' + tableID).DataTable({
            data: dtd,
            searchHighlight: true,
            ordering: true,
            lengthChange: true,
            buttons: [
                'selectAll',
                'selectNone'
            ],
            select: false,
            language: {
                "info": "Showing _START_ to _END_ of _TOTAL_ datafiles",
                "search": ''
            },
            order: [
                [2, "desc"]
            ],
            columns: [
                {
                    "title": "Datafile",
                    "data": "target_label",
                    "visible": true
                },
                {
                    "title": "Status",
                    "data": null,
                    "width": "5%",
                    "orderable": false,
                    "render": function (data) {
                        var renderHTML = $('<div class="submission-status" id="' + submissionRecord.record_id + '_' + data.target_id + '"></div>');
                        return $('<div/>').append(renderHTML).html();
                    }
                },
                {
                    "data": "target_id",
                    "visible": false
                }
            ],
            dom: 'fr<"row"><"row info-rw2" i>tlp',
        });

        $('#submission_bundle_table_' + submissionRecord.record_id + '_filter')
            .find("input")
            .removeClass("input-sm")
            .attr("placeholder", "Search datafiles")
            .attr("size", 20);


    }

    function update_submission_progress(submission_information) {
        for (var i = 0; i < submission_information.length; ++i) {
            var submissionRecord = submission_information[i];

            //some housekeeping...
            $("#submission_control_" + submissionRecord.submission_id).html('');
            $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status').html('');

            //set datafile upload status if available
            submissionRecord.bundle.forEach(function (item) {//first use bundle to clear
                $("#" + submissionRecord.submission_id + "_" + item).html('');
            });

            submissionRecord.bundle_meta.forEach(function (item) {//then use bundle_meta to set status
                if (item.upload_status) {
                    $("#" + submissionRecord.submission_id + "_" + item.file_id)
                        .html('<i class="fa fa-check-circle-o" data-toggle="tooltip" title="uploaded" aria-hidden="true" style="color:#339933; font-size: 18px;"></i>');
                }
            });

            if (submissionRecord.submission_status) {
                //submission is complete
                $("#submission_firstcol_" + submissionRecord.submission_id).find(".firstcol-completed1").css("display", "block");
                $("#submission_firstcol_" + submissionRecord.submission_id).find(".firstcol-completed2").css("display", "block").html(submissionRecord.completed_on);

                $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                    .attr(
                        {
                            "class": "progress-bar progress-bar-success",
                            "aria-valuenow": "100"
                        }
                    )
                    .css({"min-width": "2em", "width": "100%"})
                    .html("Complete");

                var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                progressObject
                    .html('')
                    .append('<div><span class=" submission-info-label">Click \'View\' for accessions.</span></div>');
                actionButton = get_accession_action(submissionRecord.submission_id);

                $("#submission_control_" + submissionRecord.submission_id)
                    .html('')
                    .append(actionButton);

            } else {
                //is this an active submission?
                if (submissionRecord.active_submission) {
                    //this is an active submission
                    $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                        .attr(
                            {
                                "class": "progress-bar progress-bar-striped active",
                                "aria-valuenow": submissionRecord.pct_completed
                            }
                        )
                        .css({"min-width": "2em", "width": submissionRecord.pct_completed + "%"})
                        .html(submissionRecord.pct_completed + "%");

                    var uploading_datafile = '';
                    if (submissionRecord.hasOwnProperty('datafile')) {
                        uploading_datafile = submissionRecord.datafile;
                    }

                    var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                    progressObject.html('');

                    //if all files have been uploaded and feedback given, then display that
                    if (submissionRecord.hasOwnProperty("transfer_status") && submissionRecord.transfer_status == "completed") {
                        $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                            .attr(
                                {
                                    "class": "progress-bar progress-bar-striped active",
                                    "aria-valuenow": "100"
                                }
                            )
                            .css({"min-width": "2em", "width": "100%"})
                            .html("");

                        progressObject.append('<div><span class="submission-info-label copo-e-loading">Completing submission</span></div>');
                    } else {
                        if (uploading_datafile) {
                            progressObject.append('<div><span class=" submission-info-label">' + uploading_datafile + '</span></div>');
                        }

                        if (submissionRecord.upload_sizerate_summary != '') {
                            progressObject.append('<div><span class=" submission-info-label">' + submissionRecord.upload_sizerate_summary + '</span></div>');
                        }

                        if (submissionRecord.uploaded_summary != '') {
                            progressObject.append('<div><span class=" submission-info-label">' + submissionRecord.uploaded_summary + '</span></div>');
                        }
                    }

                } else {
                    //this is not an active submission, but was it previously started and error reported?
                    var actionButton = '';

                    if (submissionRecord.hasOwnProperty("submission_error") && submissionRecord.submission_error) {
                        $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                            .attr(
                                {
                                    "class": "progress-bar progress-bar-danger progress-bar-striped active",
                                    "aria-valuenow": "100"
                                }
                            )
                            .css({"min-width": "2em", "width": "100%"})
                            .html("");

                        var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                        var errorMessage = submissionRecord.submission_error + "<br/> Please click 'Retry' to restart.";
                        progressObject
                            .html('')
                            .append('<div><span class=" submission-info-label" style="color: #c93c00;">' + errorMessage + '</span></div>');
                        actionButton = get_submit_action(submissionRecord.submission_id, "retry");
                    } else {
                        var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                        progressObject
                            .html('')
                            .append('<div><span class=" submission-info-label">Pending submission. Please click \'Submit\' to begin.</span></div>');
                        actionButton = get_submit_action(submissionRecord.submission_id, $("#submission_control_" + submissionRecord.submission_id), "submit");
                    }


                    $("#submission_control_" + submissionRecord.submission_id)
                        .html('')
                        .append(actionButton);
                }
            }
        }

        refresh_tool_tips();

        //now trigger polling if not already started
        if (!intervalIsSet) {
            intervalIsSet = true;

            //set polling into motion
            setInterval(function () {
                //get submissions information
                get_submission_information();
            }, 1000);
        }
    }

    function sanitise_submissions() {
        $.ajax({
            url: copoFormsURL,
            type: "POST",
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                'task': 'sanitise_submissions',
                'component': component
            },
            success: function (data) {
                ;
            },
            error: function () {
                alert("Couldn't update submissions!");
            }
        });
    }

    function load_submissions() {
        $.ajax({
            url: copoVisualsURL,
            type: "POST",
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                'task': 'table_data',
                'component': component
            },
            success: function (data) {
                do_render_submission_table(data);
                tableLoader.remove();
            },
            error: function () {
                alert("Couldn't retrieve submissions!");
            }
        });
    }

    function treat_ena_status(status, targetID) {
        //submission to ena has been divided into several callable micro-tasks,
        // and this function enables iteration through the submission micro-tasks,
        // making server calls to actually fulfill them

        if (status.trim().toLowerCase() == "completed") {
            ; //submission completed, this will be picked up and reported elsewhwere
        } else if (status.trim().toLowerCase() == "error") {
            ; //submission error, this will be picked up and reported elsewhwere
        } else {
            //move on to next stage of the submission

            var request_params = {
                'sub_id': targetID,
                'ena_status': status
            };
            $.ajax({
                url: "/rest/submit_to_repo/",
                type: "POST",
                headers: {
                    'X-CSRFToken': csrftoken
                },
                data: request_params,
                success: function (data) {
                    try {
                        data = JSON.parse(data);
                        if (data.status.hasOwnProperty("ena_status")) {
                            console.log(data.status.ena_status);
                            treat_ena_status(data.status.ena_status, targetID);
                            return;
                        }
                    } catch (err) {
                        console.log(err)
                    }
                },
                error: function () {
                    console.log("Couldn't complete submission to the target repository!");
                }
            });
        }
    }

    function get_submission_information() {
        var request_params = {
            'ids': JSON.stringify(submissionIDS)
        };

        $.ajax({
            url: "/rest/get_upload_information/",
            type: "POST",
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: request_params,
            success: function (data) {
                update_submission_progress(data.submission_information);
            },
            error: function () {
                //alert("Couldn't retrieve submissions information!");
            }
        });
    }

    function get_submit_action(submission_id, element, typeMessage) {
        var buttonLabel = 'Submit';
        var is_enabled = 'disabled'; //toni's comments - this will force even ENA based submission to be disabled, so overriding
        is_enabled = '';
        if ($(element).data('repo-selected')) {
            is_enabled = 'enabled'
        }
        var buttonClass = "tiny ui basic primary button " + is_enabled;
        if (typeMessage == 'retry') {
            buttonLabel = 'Retry';
            buttonClass = "tiny ui basic red button";
        }

        var actionButton = $('<div/>',
            {
                class: buttonClass,
                tabindex: "0",
                "data-target": submission_id,
                click: function (event) {
                    event.preventDefault();
                    var targetID = $(this).attr("data-target");

                    BootstrapDialog.show({
                        title: "Submit to repository",
                        message: 'Are you sure you want to submit to the target repository?',
                        cssClass: 'copo-modal2',
                        closable: false,
                        animate: true,
                        type: BootstrapDialog.TYPE_PRIMARY,
                        buttons: [{
                            label: 'Cancel',
                            cssClass: 'tiny ui basic button',
                            action: function (dialogRef) {
                                dialogRef.close();
                            }
                        }, {
                            label: '<i class="copo-components-icons fa fa-cloud-upload"></i> Submit',
                            cssClass: 'tiny ui basic primary button',
                            action: function (dialogRef) {
                                dialogRef.close();
                                var form_data = $('#metadata_form').serializeFormJSON()
                                var request_params = {
                                    'sub_id': targetID,
                                    'form_data': form_data
                                };

                                $.ajax({
                                    url: "/rest/submit_to_repo/",
                                    type: "POST",
                                    headers: {
                                        'X-CSRFToken': csrftoken
                                    },
                                    data: request_params,
                                    success: function (data) {
                                        try {
                                            data = JSON.parse(data);
                                            if (data.status.hasOwnProperty("ena_status")) {
                                                treat_ena_status(data.status.ena_status, targetID);
                                            }
                                            if (data.hasOwnProperty("status") && data.status == 1) {
                                                alert(data.message)
                                                return false
                                            }
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    },
                                    error: function (data) {
                                        BootstrapDialog.show({
                                            title: "Submission Error",
                                            message: data.statusText + " - Error " + data.responseText,
                                            cssClass: 'copo-modal2',
                                            closable: true,
                                        })
                                    }
                                });
                            }
                        }]
                    });
                }
            })
            .append('<i class="copo-components-icons fa fa-cloud-upload"></i>')
            .append('<span style="padding-left: 3px;" >' + buttonLabel + '</span>');

        return actionButton
    }

    function get_accession_action(submission_id) {
        var actionButton = $('<div/>',
            {
                class: 'tiny ui basic green button',
                tabindex: "0",
                "data-target": submission_id,
                click: function (event) {
                    //get_submission_accessions
                    var targetID = $(this).attr("data-target");

                    $.ajax({
                        url: copoVisualsURL,
                        type: "POST",
                        headers: {
                            'X-CSRFToken': csrftoken
                        },
                        data: {
                            'task': 'get_submission_accessions',
                            'target_id': targetID,
                            'component': component
                        },
                        success: function (data) {
                            console.log(data)
                            BootstrapDialog.show({
                                title: "Submission Accessions",
                                message: $('<div></div>').append('<table id="submission_accession_table_' + targetID + '" class="ui celled stripe table hover copo-noborders-table" cellspacing="0" width="100%"></table>'),
                                cssClass: 'copo-modal4',
                                closable: false,
                                animate: true,
                                type: BootstrapDialog.TYPE_SUCCESS,
                                onshown: function (dialogRef) {
                                    //display accessions
                                    var tableID = 'submission_accession_table_' + targetID;
                                    if ($.fn.dataTable.isDataTable('#' + tableID)) {
                                        //if table instance already exists, then destroy in order to successfully re-initialise
                                        $('#' + tableID).destroy();
                                    }

                                    var dataSet = data.submission_accessions.dataSet;
                                    var columns = data.submission_accessions.columns;


                                    var accessionTable = $('#' + tableID).DataTable({
                                        data: dataSet,
                                        columns: columns,
                                        order: [[3, 'asc']],
                                        rowGroup: {
                                            dataSrc: 3
                                        },
                                        columnDefs: [
                                            {
                                                "width": "10%",
                                                "targets": [1]
                                            }
                                        ],
                                        buttons: [
                                            'copy', 'csv',
                                            {
                                                extend: 'excel',
                                                text: 'Spreadsheet',
                                                title: null
                                            }
                                        ],
                                        dom: 'Bfr<"row"><"row info-rw" i>tlp',
                                    });

                                    accessionTable
                                        .buttons()
                                        .nodes()
                                        .each(function (value) {
                                            $(this)
                                                .removeClass("btn btn-default")
                                                .addClass('tiny ui basic green button');
                                        });
                                },
                                buttons: [
                                    {
                                        label: 'Close',
                                        cssClass: 'tiny ui basic button',
                                        action: function (dialogRef) {
                                            dialogRef.close();
                                        }
                                    }
                                ]
                            });
                        },
                        error: function () {
                            alert("Couldn't retrieve accessions!");
                        }
                    });
                }
            })
            .append('<i class="copo-components-icons fa fa-eye"></i>')
            .append('<span style="padding-left: 3px;">View</span>');

        return actionButton
    }

//handles button events on a record or group of records
    function do_record_task(event) {
        var task = event.task.toLowerCase(); //action to be performed e.g., 'Edit', 'Delete'
        var tableID = event.tableID; //get target table


        //retrieve target records and execute task
        var table = $('#' + tableID).DataTable();
        var records = []; //
        $.map(table.rows('.selected').data(), function (item) {
            records.push(item);
        });

        if (records.length == 0) {
            return false;
        }

        if (task == "delete") {
            ;//will need to think this again...in terms of deletion policy
        }
        //table.rows().deselect(); //deselect all rows

    } //end of func


}) //end document ready
