var submissionIDS = [];
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

    //create a web socket to manage submission progress reports
    var profileId = $('#profile_id').val();

    var submissionSocket = new ReconnectingWebSocket(
        'ws://' + window.location.host +
        '/ws/submission_status/' + profileId + '/');

    submissionSocket.onmessage = function (e) {
        var data = JSON.parse(e.data);

        if (data.hasOwnProperty('submission_id')) {
            get_submission_information([data.submission_id]);
        }
    };

    // submissionSocket.send(JSON.stringify({
    //         'message': message
    //     }));

    submissionSocket.onclose = function (e) {
        console.error('Chat socket closed unexpectedly');
    };


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

    //ena-study-release
    $(document).on('click', '.ena-study-release', function (event) {
        event.preventDefault();

        var target_id = $(this).attr("data-target");
        var elem = $(this);

        BootstrapDialog.show({
            title: "Release study",
            message: 'Are you sure you want to go ahead with the release of this study? <div class="text-primary" style="margin-top:10px;">Please note that this study, and all dependent objects, will be made public. It can take up to 24 hours, from the time of release, for a study to be publicly available on the ENA browser.</div>',
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
                label: 'Release',
                cssClass: 'tiny ui basic primary button',
                action: function (dialogRef) {
                    elem.addClass("disabled");

                    $.ajax({
                        url: "/rest/release_ena_study/",
                        type: "POST",
                        headers: {
                            'X-CSRFToken': csrftoken
                        },
                        data: {
                            'target_id': target_id
                        },
                        success: function (data) {
                            get_submission_information(submissionIDS);
                            dialogRef.close();
                            try {
                                data = JSON.parse(data);
                                if (data.hasOwnProperty("status") && data.status == 1) {
                                    elem.removeClass("disabled");
                                    var message = "Couldn't complete request due to error";

                                    if (data.hasOwnProperty("message")) {
                                        message = data.message;
                                    }

                                    BootstrapDialog.show({
                                        title: "Submission update error",
                                        type: BootstrapDialog.TYPE_DANGER,
                                        message: message,
                                        cssClass: 'copo-modal3',
                                        buttons: [{
                                            label: 'OK',
                                            cssClass: 'tiny ui basic button',
                                            action: function (dialogRef) {
                                                dialogRef.close();
                                            }
                                        }]
                                    });
                                } else if (data.hasOwnProperty("status") && data.status == 0) {
                                    var message = "Study release successful.";

                                    if (data.hasOwnProperty("message")) {
                                        message = data.message;
                                    }

                                    BootstrapDialog.show({
                                        title: "Submission update success",
                                        type: BootstrapDialog.TYPE_SUCCESS,
                                        message: message,
                                        cssClass: 'copo-modal3',
                                        buttons: [{
                                            label: 'OK',
                                            cssClass: 'tiny ui basic button',
                                            action: function (dialogRef) {
                                                dialogRef.close();
                                            }
                                        }]
                                    });
                                }
                            } catch (err) {
                                elem.removeClass("disabled");
                                console.log(err);
                            }
                        },
                        error: function (data) {
                            elem.removeClass("disabled");
                            dialogRef.close();
                            BootstrapDialog.show({
                                title: "Submission update error",
                                type: BootstrapDialog.TYPE_DANGER,
                                message: data.statusText + " - Error " + data.responseText,
                                cssClass: 'copo-modal3',
                                buttons: [{
                                    label: 'OK',
                                    cssClass: 'tiny ui basic button',
                                    action: function (dialogRef) {
                                        dialogRef.close();
                                    }
                                }]
                            });
                        }
                    });
                }
            }]
        });
    });

    //delete submission record
    $(document).on('click', '.delete-submission', function (event) {
        event.preventDefault();

        var target_id = $(this).attr("data-target");


        var message = $('<div/>', {class: "webpop-content-div"});
        message.append("Are you sure you want to delete this submission record?</div>");

        BootstrapDialog.show({
            title: "Delete submission",
            message: message,
            cssClass: 'copo-modal2',
            closable: false,
            animate: true,
            type: BootstrapDialog.TYPE_DANGER,
            // size: BootstrapDialog.SIZE_NORMAL,
            buttons: [
                {
                    label: 'Cancel',
                    cssClass: 'tiny ui basic button',
                    action: function (dialogRef) {
                        dialogRef.close();
                    }
                },
                {
                    id: "btn-remove-bundle",
                    label: '<i style="padding-right: 5px;" class="fa fa-trash-o" aria-hidden="true"></i> Delete',
                    cssClass: 'tiny ui basic red button',
                    action: function (dialogRef) {
                        var $button = this;
                        $button.disable();

                        $.ajax({
                            url: copoFormsURL,
                            type: "POST",
                            headers: {
                                'X-CSRFToken': csrftoken
                            },
                            data: {
                                'task': 'delete',
                                'component': component,
                                'target_ids': JSON.stringify([target_id]),
                            },
                            success: function (data) {
                                var tableID = componentMeta.tableID;

                                if ($.fn.dataTable.isDataTable('#' + tableID)) {
                                    var table = $('#' + tableID).DataTable();
                                    table.row("#row_" + target_id).remove().draw();
                                }

                                dialogRef.close();
                            },
                            error: function () {
                                alert("Couldn't delete submission!");
                                dialogRef.close();
                            }
                        });

                        return false;
                    }
                }
            ]
        });

    });

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
            var meta = []
            if (data.hasOwnProperty('meta')) {
                meta = data.meta;
            }

            var destination_repo = undefined
            if (data.hasOwnProperty('destination_repo')) {
                if (data.destination_repo) {
                    if (typeof (data.destination_repo == 'object')) {
                        if (Object.keys(data.destination_repo).length > 0) {
                            destination_repo = data.destination_repo;
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

            //get row id
            var DT_RowId = '';
            if (data.hasOwnProperty("DT_RowId")) {
                DT_RowId = data.DT_RowId;
            }

            //get s_n
            var s_n = '';
            if (data.hasOwnProperty("s_n")) {
                s_n = data.s_n;
            }

            if (record_id) {
                var option = {};
                option["s_n"] = s_n;
                option["DT_RowId"] = DT_RowId;
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
                        // 'selectAll',
                        // 'selectNone'
                    ],
                    // select: {
                    //     style: 'multi', //os, multi, api
                    //     items: 'row' //row, cell, column
                    // },
                    select: false,
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
                        [1, "desc"]
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

                                var delete_submission_button = '<div id="submission_delete_button_' + data.record_id + '" class="tiny ui basic red button disabled delete-submission" tabindex="0" data-target="' + data.record_id + '"><i class="copo-components-icons fa fa-trash"></i><span style="padding-left: 3px;">Delete</span></div>';
                                var colsFirstHTML = $('<div class="col-sm-6 col-md-6 col-lg-6" id="submission_firstcol_' + data.record_id + '"></div>')
                                    .append('<div style="margin-bottom: 20px;">' + delete_submission_button + '</div>')
                                    .append('<div class="submission-attributes">Created: ' + '<span id="submission_created_label_' + data.record_id + '">' + data.date_created + '</span></div>')
                                    .append('<div class="submission-attributes">Completed: ' + '<span id="submission_completed_label_' + data.record_id + '">Pending</span></div>')

                                var repo_selected = false
                                if (data.destination_repo != undefined) {
                                    repo_selected = true;
                                }

                                var fixed_repos = ["ena", "figshare", "ena-ant"]

                                if (fixed_repos.indexOf(data.special_repositories) > -1) {
                                    colsFirstHTML.append('<div class="submission-attributes">Target Repository: ' + '<span id="target_repo_label_' + data.record_id + '">' + data.repository + '</span></div>');
                                } else {
                                    if (data.complete == 'true') {
                                        if (data.special_repositories == 'dataverse') {
                                            // add publish button to table if complete
                                            colsFirstHTML.append('<button style="margin-left: 5px"  data-submission_id="' + data.record_id + '" class="btn btn-default" type="button" id="publish_dataset">Publish</button>')
                                        } else {
                                            ;
                                        }
                                    } else {
                                        if (jQuery.isEmptyObject(data.destination_repo)) {
                                            colsFirstHTML.append('<div>Target Repository:' + '<span style="font-weight: bolder; margin: 5px 0 5px 5px" id="target_repo_label_' + data.record_id + '" style="margin-bottom: 10px;"></span></div>')
                                        } else {
                                            colsFirstHTML.append('<div>Target Repository:' + '<span style="font-weight: bolder; margin: 5px 0 5px 5px" id="target_repo_label_' + data.record_id + '" style="margin-bottom: 10px;">' + data.destination_repo.url + '</span></div>')
                                        }

                                        if (data.special_repositories == 'cg_core' || data.special_repositories == 'dcterms' || data.special_repositories == 'ckan' || data.special_repositories == 'dataverse' || data.special_repositories == 'dspace') {

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
                                                } else {
                                                    colsFirstHTML.append('<button style="margin-left: 5px" data-toggle="modal" data-submission_id="' + data.record_id + '" data-target="#repo_modal" class="btn btn-default disabled" type="button" id="view_repo_structure_' + data.record_id + '">Inspect Repository</button>')

                                                }
                                            }

                                            if (data.accessions == undefined) {
                                                ;
                                            } else if (!jQuery.isEmptyObject(data.meta) && data.meta != "") {
                                                if ($(data.meta)[0].hasOwnProperty('identifier') || $(data.meta)[0].hasOwnProperty('alias')) {
                                                    if (data.destination_repo['type'] == 'dspace') {
                                                        colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to Dataset: <span class="badge">' + data.meta.identifier + ' - ' + data.meta.dspace_item_name + '</span></div>')
                                                    } else if (data.destination_repo['type'] == 'dataverse') {
                                                        if ($(data.meta)[0].hasOwnProperty('identifier')) {
                                                            colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to Dataset: <span class="badge">' + data.meta.identifier + ' ' + data.meta.alias + ' - ' + data.meta.doi + '</span></div>')
                                                        } else if ($(data.meta)[0].hasOwnProperty('alias')) {
                                                            colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to Dataverse: <span class="badge">' + data.meta.alias + '</span></div>')
                                                        }
                                                    } else if (data.destination_repo['type'] == 'ckan') {
                                                        colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to CKAN Package: <span class="badge">' + data.meta.identifier + '</span></div>')
                                                    }
                                                } else if (data.meta.hasOwnProperty("repo_type") && data.meta.repo_type == "ckan") {
                                                    colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Submitting to New CKAN Package</div>')
                                                }
                                            } else {
                                                colsFirstHTML.append('<div style="margin-top: 20px; display: block" class="dataset-label">Choose Submission Target</span></div>')
                                            }
                                        }

                                    }
                                }

                                var colsSecondHTML = $('<div class="col-sm-6 col-md-6 col-lg-6"></div>');

                                bodyRow.append(colsFirstHTML);
                                bodyRow.append(colsSecondHTML);

                                var uigrid = $('<div class="ui grid"></div>');
                                colsSecondHTML.append(uigrid);

                                var uicol1 = $('<div class="twelve wide column"></div>');
                                var uicol2 = $('<div class="four wide column"></div>');

                                uigrid
                                    .append(uicol1)
                                    .append(uicol2)

                                uicol1.append($(".submission-progess-wrapper").clone().attr("id", "submission_progress_" + data.record_id));
                                uicol2.append($('<div data-repo-selected="' + repo_selected + '" id="submission_control_' + data.record_id + '"></div>'));


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
                            "data": "s_n",
                            "title": "S/N",
                            "visible": false
                        },
                        {
                            "data":
                                "repository",
                            "title":
                                "Repository",
                            "visible":
                                false
                        },
                        {
                            "data":
                                "date_created",
                            "title":
                                "Created",
                            "visible":
                                false
                        },
                        {
                            "data":
                                "status",
                            "visible":
                                false
                        },
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
                            get_submission_information(submissionIDS);
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
            table = $('#' + tableID).DataTable({
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
        }


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
            var processed_status = false;

            // is this a completed submission?
            if (submissionRecord.hasOwnProperty("submission_status") && (submissionRecord.submission_status.toString() == "true")) {
                //submission is complete
                $("#submission_completed_label_" + submissionRecord.submission_id).html(submissionRecord.completed_on);

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

                //feedback message
                var submisson_message_div = $('<div/>',
                    {
                        style: "word-wrap: break-word; max-height: 300px; overflow-y: scroll",
                        "class": "ui success message",
                        "html": '<div class="message">Submission completed. Click the view button for accessions.</div>'
                    });

                progressObject
                    .html('')
                    .append(submisson_message_div);

                actionButton = get_accession_action(submissionRecord.submission_id);

                $("#submission_control_" + submissionRecord.submission_id)
                    .html('')
                    .append(actionButton);

                //disable delete button
                $("#submission_delete_button_" + submissionRecord.submission_id).addClass("disabled");

                //embargo info for ena submissions
                if (submissionRecord.hasOwnProperty("release_status")) {
                    var release_message = '<hr/><div style="margin-bottom: 10px;">' + submissionRecord.release_message + '</div>';
                    if (submissionRecord.release_status == "PRIVATE") {
                        release_message = release_message + '<div class="tiny ui blue button ena-study-release" tabindex="0" data-target="' + submissionRecord.submission_id + '">Release study</div>';
                    } else if (submissionRecord.release_status == "PUBLIC") {
                        release_message = release_message + '<div><a class="tiny ui blue button" tabindex="0" data-target="' + submissionRecord.submission_id + '" href="' + submissionRecord.study_view_url + '" target="_blank"><span>View on ENA</span><i style="margin-left: 5px; font-size: 12px;" class="fa fa-external-link"></i></a></div>';
                    }

                    var release_status = $('<div style="margin-top: 10px;">' + release_message + '</div>');
                    submisson_message_div.find(".message").append(release_status);
                }

                processed_status = true;
                continue;

            }

            //is this an active submission?
            if (submissionRecord.hasOwnProperty("is_active_submission") && submissionRecord.is_active_submission.toString().toLowerCase() == "true") {
                var actionButton = '';
                var status_message = '';

                //disable delete button
                $("#submission_delete_button_" + submissionRecord.submission_id).addClass("disabled");

                var progressClass = "progress-bar active";
                var submisson_message_div = $('<div/>',
                    {
                        style: "word-wrap: break-word; max-height: 300px; overflow-y: scroll",
                    });

                if (submissionRecord.hasOwnProperty("submission_report") && submissionRecord.submission_report.type == "info") {
                    status_message = submissionRecord.submission_report.message;
                    progressClass = progressClass + " progress-bar-striped ";
                    submisson_message_div.addClass("ui info message");
                } else if (submissionRecord.hasOwnProperty("submission_report") && submissionRecord.submission_report.type == "error") {
                    status_message = submissionRecord.submission_report.message;
                    progressClass = progressClass + " progress-bar-danger progress-bar-striped ";
                    submisson_message_div.addClass("ui negative message");
                }

                $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                    .attr({"class": progressClass, "aria-valuenow": '100'})
                    .css({"min-width": "2em", "width": "100%"})
                    .html('');

                var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                submisson_message_div.append('<div class="webpop-content-div">' + status_message + '</div>');
                progressObject
                    .html('')
                    .append(submisson_message_div);

                $("#submission_control_" + submissionRecord.submission_id)
                    .html('')
                    .append(actionButton);

                //report on submitted datafiles
                if (submissionRecord.hasOwnProperty("submitted_files")) {
                    submissionRecord.submitted_files.forEach(function (item) {
                        try {
                            $("#" + submissionRecord.submission_id + "_" + item)
                                .html('<i class="fa fa-check-circle-o" data-toggle="tooltip" title="submitted" aria-hidden="true" style="color:#339933; font-size: 18px;"></i>');
                        } catch (err) {
                            ;
                        }
                    });
                }

                processed_status = true;
                continue;

            }


            //not submitted, not active
            if (!processed_status) {
                var actionButton = '';
                var typeMessage = 'pending';
                var status_message = 'Pending submission. Please click the submit button to continue.';
                var progressClass = "progress-bar active";

                //enable delete button
                $("#submission_delete_button_" + submissionRecord.submission_id).removeClass("disabled");

                //feedback message
                var submisson_message_div = $('<div/>',
                    {
                        style: "word-wrap: break-word; max-height: 300px; overflow-y: scroll",
                    });

                var feedback_class = "ui info message";


                if (submissionRecord.hasOwnProperty("enable_submit_button") && (submissionRecord.enable_submit_button.toString() == "true")) {
                    typeMessage = 'submit';
                }

                if (submissionRecord.hasOwnProperty("submission_report") && submissionRecord.submission_report.type == "error") {
                    typeMessage = 'retry';
                    feedback_class = "ui negative message";
                    status_message = submissionRecord.submission_report.message;
                    progressClass = progressClass + " progress-bar-danger progress-bar-striped ";
                }

                submisson_message_div.addClass(feedback_class);

                var progressObject = $("#submission_progress_" + submissionRecord.submission_id).find('.submission-progress-status');
                submisson_message_div.append('<div class="webpop-content-div">' + status_message + '</div>');
                progressObject
                    .html('')
                    .append(submisson_message_div);

                actionButton = get_submit_action(submissionRecord.submission_id, typeMessage);

                $("#submission_progress_" + submissionRecord.submission_id).find(".progress-bar")
                    .attr({"class": progressClass, "aria-valuenow": '100'})
                    .css({"min-width": "2em", "width": "100%"})
                    .html('');

                $("#submission_control_" + submissionRecord.submission_id)
                    .html('')
                    .append(actionButton);

                //report on submitted datafiles
                if (submissionRecord.hasOwnProperty("submitted_files")) {
                    submissionRecord.submitted_files.forEach(function (item) {
                        try {
                            $("#" + submissionRecord.submission_id + "_" + item)
                                .html('<i class="fa fa-check-circle-o" data-toggle="tooltip" title="submitted" aria-hidden="true" style="color:#339933; font-size: 18px;"></i>');
                        } catch (err) {
                            ;
                        }
                    });
                }

                processed_status = true;
                continue

            }


        }

        refresh_tool_tips();
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
            error: function (data) {
                alert("Couldn't retrieve submissions!");
                console.log(data)
            }
        });
    }

    function get_submission_information(submission_ids) {
        var request_params = {
            'ids': JSON.stringify(submission_ids)
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
                console.log("Couldn't retrieve submissions information!");
            }
        });
    }

    function get_submit_action(submission_id, typeMessage) {
        var buttonLabel = 'Submit';
        var buttonClass = "tiny ui basic button ";

        if (typeMessage == "submit") {
            buttonClass = buttonClass + "primary enabled";
        } else if (typeMessage == 'retry') {
            buttonLabel = 'Retry';
            buttonClass = buttonClass + "red enabled";
        } else {
            buttonClass = buttonClass + "primary disabled";
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
                                        get_submission_information(submissionIDS);
                                        try {
                                            data = JSON.parse(data);
                                            if (data.hasOwnProperty("status") && data.status == 1) {
                                                console.log(data.message)
                                                return false
                                            }
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    },
                                    error: function (data) {
                                        get_submission_information(submissionIDS);
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

                                    var rowGroup = null;
                                    var groupAcessionRepos = ["ena"];
                                    if (data.submission_accessions.hasOwnProperty('repository') && groupAcessionRepos.indexOf(data.submission_accessions.repository) > -1) {
                                        rowGroup = {dataSrc: 3};
                                    }


                                    var accessionTable = $('#' + tableID).DataTable({
                                        data: dataSet,
                                        columns: columns,
                                        order: [[3, 'asc']],
                                        rowGroup: rowGroup,
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
