/**
 * Created by fshaw on 22/03/2017.
 */

$(document).ready(function () {

    get_ontologies_for_filter()

    $(document).on('click', '#ontology_dropdown_filter li', handle_ontology_filter_click)

})


function get_ontologies_for_filter() {
    // this function will query OLS for a list of current ontologies to populate the dropdown control on a page needing filtering of ontologies
    $.ajax({

        url: 'http://www.ebi.ac.uk/ols/api/ontologies?size=5000',
        dataType: 'json',
        method: 'GET'

    }).done(function (d) {
        $(d._embedded.ontologies).each(function (idx, data) {

            var anchor = $('<a></a>')
            var list_item = $('<li/>',
                {
                    'class': 'ontology_dd_item'
                }
            )
            var header_span = $('<span/>', {
                'class': 'h5'
            })
            var ontology_name = $('<span/>', {
                'class': 'ontology_dd_name'
            }).html(data.config.title)
            $(list_item).data('id', data.ontologyId)
            $(list_item).data('name', data.config.title)
            var ontology_description = $('<small>', {
                'class': 'ontology_dd_description'
            }).html(data.config.description)

            $(header_span).append(ontology_name).append('<br/>').append(ontology_description)
            $(anchor).append($(list_item).append(header_span))
            $('#ontology_dropdown_filter').append(anchor)

        })
    })
}


function handle_ontology_filter_click(e) {
    var li = e.currentTarget
    $('#ontology_filter_button').find(".ontology_label").html(
        $(li).data('name')
    )
    $(document).data('search_ontology', $(li).data('id'))

    if ($(li).data('name') == 'All Ontologies') {
        var autocomplete_url = '/copo/ajax_search_ontology/999/'
    }
    else {
        var autocomplete_url = '/copo/ajax_search_ontology/' + $(li).data('id')
    }
    $('#an-column').attr('data-autocomplete', autocomplete_url)

}