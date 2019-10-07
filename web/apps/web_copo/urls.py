from django.urls import path, re_path
from . import views
from web.apps.web_copo.utils import ajax_handlers, annotation_handlers

app_name = 'web_copo'
urlpatterns = [
    path('', views.index, name='index'),
    path('dataverse_submit/', views.test_dataverse_submit, name='test_dataverse_submit'),
    path('test_submission/', views.test_submission, name='test_submission'),
    path('test/', views.test, name='test'),
    path('login/', views.login, name='auth'),
    path('logout/', views.copo_logout, name='logout'),
    path('register/', views.copo_register, name='register'),
    path('profile/update_counts/', views.get_profile_counts, name='update_counts'),
    path('view_user_info/', views.view_user_info, name='view_user_info'),
    path('error/', views.goto_error, name='error_page'),
    path('register_to_irods/', views.register_to_irods, name='register_to_irods'),
    re_path(r'^copo_profile/(?P<profile_id>[a-z0-9]+)/view', views.view_copo_profile,
            name='view_copo_profile'),
    re_path(r'^copo_publications/(?P<profile_id>[a-z0-9]+)/view', views.copo_publications,
            name='copo_publications'),
    re_path(r'^copo_data/(?P<profile_id>[a-z0-9]+)/view', views.copo_data,
            name='copo_data'),
    re_path(r'^copo_samples/(?P<profile_id>[a-z0-9]+)/view', views.copo_samples,
            name='copo_samples'),
    re_path(r'^copo_submissions/(?P<profile_id>[a-z0-9]+)/view', views.copo_submissions,
            name='copo_submissions'),
    re_path(r'^copo_people/(?P<profile_id>[a-z0-9]+)/view', views.copo_people,
            name='copo_people'),
    re_path(r'^copo_annotation/(?P<profile_id>[a-z0-9]+)/view', views.copo_annotation,
            name='copo_annotation'),
    re_path(r'^copo_repository/(?P<profile_id>[a-z0-9]+)/view', views.copo_repository,
            name='copo_repository'),
    re_path(r'^annotate_meta/(?P<file_id>[a-z0-9]+)/view', views.annotate_meta, name='annotate_meta'),
    re_path(r'^resolve/(?P<submission_id>[a-z0-9]+)', views.resolve_submission_id,
            name="resolve_submission_id"),
    path('get_source_count/', ajax_handlers.get_source_count,
         name="get_source_count"),
    re_path(r'^ajax_search_ontology/(?P<ontology_names>[a-zA-Z0-9,]+)/$',
            ajax_handlers.search_ontology_ebi, name='ajax_search_ontology'),
    re_path(r'^ajax_search_copo_local/(?P<data_source>[a-zA-Z0-9,_]+)/$',
            ajax_handlers.search_copo_components, name='ajax_search_copo_local'),
    path('copo_forms/', views.copo_forms, name="copo_forms"),
    path('copo_visualize/', views.copo_visualize, name="copo_visualize"),
    path('authenticate_figshare/', views.authenticate_figshare, name='authenticate_figshare'),
    path('publish_figshare/', ajax_handlers.publish_figshare, name='publish_figshare'),
    path('view_oauth_tokens/', views.view_oauth_tokens, name='view_oauth_tokens'),
    path('get_tokens_for_user/', ajax_handlers.get_tokens_for_user, name='get_tokens_for_user'),
    path('delete_token/', ajax_handlers.delete_token, name='delete_token'),
    path('get_annotation/', views.annotate_data, name='annotate_data'),
    path('agave_oauth/', views.agave_oauth, name='agave_oauth'),
    path('import_ena_accession/', views.import_ena_accession,
         name='import_ena_accession'),
    path('groups/', views.view_groups, name='groups'),
    path('create_group/', ajax_handlers.create_group, name='create_group'),
    path('delete_group/', ajax_handlers.delete_group, name='delete_group'),
    path('add_profile_to_group/', ajax_handlers.add_profile_to_group, name='add_profile_to_group'),
    path('remove_profile_from_group/', ajax_handlers.remove_profile_from_group,
         name='remove_profile_from_group'),
    path('get_profiles_in_group/', ajax_handlers.get_profiles_in_group,
         name='get_profiles_in_group'),
    path('get_users_in_group/', ajax_handlers.get_users_in_group, name="add_users_in_group"),
    path('add_user_to_group/', ajax_handlers.add_user_to_group, name="add_user_to_group"),
    path('remove_user_from_group/', ajax_handlers.remove_user_from_group, name="remove_user_from_group"),
    path('administer_repos/', views.administer_repos, name="administer_repos"),
    path('manage_repos/', views.manage_repos, name="manage_repos"),
    path('create_new_repo/', ajax_handlers.create_new_repo, name="create_new_repo"),
    path('get_repos_data/', ajax_handlers.get_repos_data, name="get_repos_data"),
    path('add_user_to_repo/', ajax_handlers.add_user_to_repo, name="add_user_to_repo"),
    path('remove_user_from_repo/', ajax_handlers.remove_user_from_repo, name="remove_user_from_repo"),
    path('get_users_in_repo/', ajax_handlers.get_users_in_repo, name="get_users_in_repo"),
    path('get_repos_for_user/', ajax_handlers.get_repos_for_user, name="get_repos_for_user"),
    path('add_repo_to_group/', ajax_handlers.add_repo_to_group, name="add_repo_to_group"),
    path('remove_repo_from_group/', ajax_handlers.remove_repo_from_group, name="remove_repo_from_group"),
    path('get_repo_info/', ajax_handlers.get_repo_info, name="get_repo_info"),
    path('get_dspace_communities/', ajax_handlers.get_dspace_communities, name="get_dspace_communities"),
    path('get_dspace_items/', ajax_handlers.get_dspace_items, name="get_dspace_items"),
    path('get_dataverse/', ajax_handlers.search_dataverse, name="get_dataverse"),
    path('get_collection/', ajax_handlers.get_dspace_collection, name="get_dspace_collections"),
    path('get_dataverse_content/', ajax_handlers.get_dataverse_content, name="get_dataverse_content"),
    path('get_info_for_new_dataverse/', ajax_handlers.get_info_for_new_dataverse,
         name="get_info_for_new_dataverse"),
    path('update_submission_repo_data/', ajax_handlers.update_submission_repo_data,
         name="update_submission_repo_data"),
    path('dataverse_publish/', ajax_handlers.publish_dataverse,
         name="publish_dataverse"),
    path('get_existing_metadata/', ajax_handlers.get_repo_info,
         name="get_dspace_item_metadata"),
    path('get_ckan_items/', ajax_handlers.get_ckan_items,
         name="get_ckan_items"),
    path('delete_repo_entry/', ajax_handlers.delete_repo_entry,
         name="delete_repo_entry"),
    path('refresh_annotation_display/', annotation_handlers.refresh_display,
         name="refresh_annotation_display"),
    path('send_file_annotation/', annotation_handlers.send_file_annotation,
         name="send_file_annotation"),
    path('refresh_annotations/', annotation_handlers.refresh_annotations,
         name="refresh_annotations"),
    path('refresh_text_annotations/', annotation_handlers.refresh_text_annotations,
         name="refresh_text_annotations"),
    path('delete_annotation/', annotation_handlers.delete_annotation,
         name="delete_annotation"),
    path('refresh_annotations_for_user/', annotation_handlers.refresh_annotations_for_user,
         name="refresh_annotations_for_user"),

    path('annotations', annotation_handlers.new_text_annotation,
         name="new_text_annotation"),
    path('search', annotation_handlers.search_text_annotation,
         name="new_text_annotation"),
    path('annotations/<str:id>', annotation_handlers.edit_or_delete_text_annotation,
         name="delete_text_annotation"),
]
