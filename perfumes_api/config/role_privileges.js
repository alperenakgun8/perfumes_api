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
            key: "user_update",
            name: "User Update",
            group: "USERS",
            description: "User update"
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
            key: "user_export",
            name: "User Export",
            group: "USERS",
            description: "User export"
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
            key: "concentration_export",
            name: "Concentration Export",
            group: "CONCENTRATIONS",
            description: "Concentration export"
        },
        {
            key: "concentration_import",
            name: "Concentration Import",
            group: "CONCENTRATIONS",
            description: "Concentration import"
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
            key: "note_export",
            name: "Note Export",
            group: "NOTES",
            description: "Note export"
        },
        {
            key: "note_import",
            name: "Note Import",
            group: "NOTES",
            description: "Note import"
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
            key: "perfume_export",
            name: "Perfume Export",
            group: "PERFUMES",
            description: "Perfume export"
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