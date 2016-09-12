$(document).ready(function () {

    //******************************Event Handlers Block*************************//
    // get table data to display via the DataTables API
    var tableID = null; //rendered table handle
    var component = "publication";
    var copoFormsURL = "/copo/copo_forms/";
    var copoVisualsURL = "/copo/copo_visualize/";

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
        },
        error: function () {
            alert("Couldn't retrieve publication data!");
        }
    });


    //event handler for resolving doi and pubmed
    $('.resolver-submit').on('click', function (event) {
        var elem = $($(event.target)).parent().parent().find(".resolver-data");

        var idHandle = elem.val();

        idHandle = idHandle.replace(/^\s+|\s+$/g, '');

        if (idHandle.length == 0) {
            return false;
        }

        $("#doiLoader").html("<div style='text-align: center'><i class='fa fa-spinner fa-pulse fa-2x'></i></div>");

        var idType = elem.attr("data-resolver");

        //reset input field to placeholder
        elem.val("");

        $.ajax({
            url: copoFormsURL,
            type: "POST",
            headers: {'X-CSRFToken': csrftoken},
            data: {
                'task': 'doi',
                'component': component,
                'id_handle': idHandle,
                'id_type': idType
            },
            success: function (data) {
                json2HtmlForm(data);
                toggle_global_side_links();
                $("#doiLoader").html("");
            },
            error: function () {
                $("#doiLoader").html("");
                alert("Couldn't resolve resource handle!");
            }
        });
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

    //******************************Functions Block******************************//

    function do_record_task(elem) {
        var task = elem.attr('data-record-action').toLowerCase(); //action to be performed e.g., 'Edit', 'Delete'
        var taskTarget = elem.attr('data-action-target'); //is the task targeting a single 'row' or group of 'rows'?

        var ids = [];

        if (taskTarget == 'row') {
            ids = [elem.attr('data-record-id')];
        } else if (taskTarget == 'rows') {
            //get reference to table, and retrieve selected rows
            if ($.fn.dataTable.isDataTable('#' + tableID)) {
                var table = $('#' + tableID).DataTable();

                ids = $.map(table.rows('.selected').data(), function (item) {
                    return item[item.length - 1];
                });
            }
        }

        //handle button actions
        if (ids.length > 0) {
            if (task == "edit") {
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
                        alert("Couldn't build publication form!");
                    }
                });
            } else if (task == "delete") { //handles delete, allows multiple row delete
                do_component_delete_confirmation("publication", ids);
            }
        }
    }

})//end document ready
