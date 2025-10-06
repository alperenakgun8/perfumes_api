module.exports = {
    privGroups: [
        {
            id: "USERS",
            name:"User Permissions"
        },
        {
            id: "ROLES",
            name:"Role Permissions"
        },
        {
            id: "COMMENTS",
            name:"Comment Permissions"
        },
        {
            id: "COMMENTS_OF_TOPICS",
            name:"CommentsOfTopic Permissions"
        },
        {
            id: "CONCENTRATIONS",
            name:"Concentration Permissions"
        },
        {
            id: "FAVORITES",
            name:"Favorite Permissions"
        },
        {
            id: "NOTES",
            name:"Note Permissions"
        },
        {
            id: "PERFUMES",
            name:"Perfume Permissions"
        },
        {
            id: "TOPICS",
            name:"Topic Permissions"
        },
        {
            id: "AUDITLOGS",
            name: "Auditlog Permissions"
        }
    ],

    privileges: [
        {
            key: "user_view",
            name: "User View",
            group: "USERS",
            description: "View all user"
        },
        {
            key: "user_login",
            name: "User Login",
            group: "USERS",
            description: "User Login"
        },
        {
            key: "user_auth",
            name: "User Auth",
            group: "USERS",
            description: "User Auth"
        },
        {
            key: "user_add",
            name: "User Add",
            group: "USERS",
            description: "User Add"
        },
        {
            key: "user_get",
            name: "User Get",
            group: "USERS",
            description: "Get one user"
        },
        {
            key: "user_update_password",
            name: "User Update Password",
            group: "USERS",
            description: "User Update Password"
        },
        {
            key: "user_update_profile_picture",
            name: "User Update Profile Picture",
            group: "USERS",
            description: "User Update Profile Picture"
        },
        {
            key: "user_delete",
            name: "User Delete",
            group: "USERS",
            description: "User Delete"
        },
        {
            key: "role_view",
            name: "Role View",
            group: "ROLES",
            description: "Role view"
        },
        {
            key: "role_add",
            name: "Role Add",
            group: "ROLES",
            description: "Role add"
        },
        {
            key: "role_update",
            name: "Role Update",
            group: "ROLES",
            description: "Role update"
        },
        {
            key: "role_delete",
            name: "Role Delete",
            group: "ROLES",
            description: "Role delete"
        },
        {
            key: "role_privileges",
            name: "Role Privileges",
            group: "ROLES",
            description: "Role privileges"
        },
        {
            key: "comment_view",
            name: "Comment View",
            group: "COMMENTS",
            description: "Comment view"
        },
        {
            key: "comment_view_perfume",
            name: "Comment View Perfume",
            group: "COMMENTS",
            description: "Perfume comments"
        },
        {
            key: "comment_view_user",
            name: "Comment View User",
            group: "COMMENTS",
            description: "User comments"
        },
        {
            key: "comment_add",
            name: "Comment Add",
            group: "COMMENTS",
            description: "Comment add"
        },
        {
            key: "comment_update",
            name: "Comment Update",
            group: "COMMENTS",
            description: "Comment update"
        },
        {
            key: "comment_delete",
            name: "Comment Delete",
            group: "COMMENTS",
            description: "Comment delete"
        },
        {
            key: "comment_of_topic_view",
            name: "Comment of Topic View",
            group: "COMMENTS_OF_TOPICS",
            description: "Comment of topic view"
        },
        {
            key: "comment_of_topic_view_topic",
            name: "Comment of Topic View Topic",
            group: "COMMENTS_OF_TOPICS",
            description: "Topic comments"
        },
        {
            key: "comment_of_topic_view_user",
            name: "Comment of Topic View User",
            group: "COMMENTS_OF_TOPICS",
            description: "User comments of topics"
        },
        {
            key: "comment_of_topic_add",
            name: "Comment of Topic Add",
            group: "COMMENTS_OF_TOPICS",
            description: "Comment of topic add"
        },
        {
            key: "comment_of_topic_update",
            name: "Comment of Topic Update",
            group: "COMMENTS_OF_TOPICS",
            description: "Comment of topics update"
        },
        {
            key: "comment_of_topic_delete",
            name: "Comment of Topic Delete",
            group: "COMMENTS_OF_TOPICS",
            description: "Comment of topics delete"
        },
        {
            key: "concentration_view",
            name: "Concentration View",
            group: "CONCENTRATIONS",
            description: "Concentration view"
        },
        {
            key: "concentration_add",
            name: "Concentration Add",
            group: "CONCENTRATIONS",
            description: "Concentration add"
        },
        {
            key: "concentration_update",
            name: "Concentration Update",
            group: "CONCENTRATIONS",
            description: "Concentration update"
        },
        {
            key: "concentration_delete",
            name: "Concentration Delete",
            group: "CONCENTRATIONS",
            description: "Concentration delete"
        },
        {
            key: "favorite_view",
            name: "Favorite View",
            group: "FAVORITES",
            description: "Favorite view"
        },
        {
            key: "favorite_add",
            name: "Favorite Add",
            group: "FAVORITES",
            description: "Favorite add"
        },
        {
            key: "favorite_delete",
            name: "Favorite Delete",
            group: "FAVORITES",
            description: "Favorite delete"
        },
        {
            key: "note_view",
            name: "Note View",
            group: "NOTES",
            description: "Note view"
        },
        {
            key: "note_add",
            name: "Note Add",
            group: "NOTES",
            description: "Note add"
        },
        {
            key: "note_update",
            name: "Note Update",
            group: "NOTES",
            description: "Note update"
        },
        {
            key: "note_delete",
            name: "Note Delete",
            group: "NOTES",
            description: "Note delete"
        },
        {
            key: "perfume_view",
            name: "Perfume View",
            group: "PERFUMES",
            description: "Perfume view"
        },
        {
            key: "perfume_brands",
            name: "Perfume Brands",
            group: "PERFUMES",
            description: "Perfume brands"
        },
        {
            key: "perfume_info",
            name: "Perfume Info",
            group: "PERFUMES",
            description: "Perfume info"
        },
        {
            key: "perfume_detail",
            name: "Perfume Detail",
            group: "PERFUMES",
            description: "Perfume detail"
        },
        {
            key: "perfume_filter_notes",
            name: "Perfume Filter Notes",
            group: "PERFUMES",
            description: "Perfume filtered by notes"
        },
        {
            key: "perfume_filter",
            name: "Perfume Filter",
            group: "PERFUMES",
            description: "Perfume filter"
        },
        {
            key: "perfume_add",
            name: "Perfume Add",
            group: "PERFUMES",
            description: "Perfume add"
        },
        {
            key: "perfume_update",
            name: "Perfume Update",
            group: "PERFUMES",
            description: "Perfume update"
        },
        {
            key: "perfume_delete",
            name: "Perfume Delete",
            group: "PERFUMES",
            description: "Perfume delete"
        },
        {
            key: "topic_view",
            name: "Topic View",
            group: "TOPICS",
            description: "Topic view"
        },
        {
            key: "topic_detail",
            name: "Topic Detail",
            group: "TOPICS",
            description: "Topic detail"
        },
        {
            key: "topic_add",
            name: "Topic Add",
            group: "TOPICS",
            description: "Topic add"
        },
        {
            key: "topic_update",
            name: "Topic Update",
            group: "TOPICS",
            description: "Topic update"
        },
        {
            key: "topic_delete",
            name: "Topic Delete",
            group: "TOPICS",
            description: "Topic delete"
        },
        {
            key: "auditlogs_view",
            name: "Auditlogs View",
            group: "AUDITLOGS",
            description: "Auditlogs view"
        },
    ]
}