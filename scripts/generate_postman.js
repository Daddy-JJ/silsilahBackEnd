const fs = require('fs');

const collection = {
  info: {
    name: "Silsilah Keluarga API (Complete)",
    description: "REST API Collection untuk aplikasi Pohon Silsilah Keluarga Kolaboratif (Phase 3).",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "base_url", value: "http://localhost:5000/api/v1", type: "string" },
    { key: "token", value: "", type: "string" },
    { key: "tree_id", value: "", type: "string" },
    { key: "member_id", value: "", type: "string" },
    { key: "user_id", value: "", type: "string" },
    { key: "plan_id", value: "", type: "string" },
    { key: "marriage_id", value: "", type: "string" },
    { key: "approval_id", value: "", type: "string" },
    { key: "merchant_order_id", value: "", type: "string" }
  ],
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{token}}", type: "string" }]
  },
  item: [
    {
      name: "Health",
      item: [
        { name: "Health Check", request: { method: "GET", url: "{{base_url}}/health" } }
      ]
    },
    {
      name: "Auth",
      item: [
        { name: "Register", request: { method: "POST", url: "{{base_url}}/auth/register", body: { mode: "raw", raw: '{"email":"test@test.com","password":"password123","nama_lengkap":"Tester"}', options: { raw: { language: "json" } } } } },
        { name: "Login", request: { method: "POST", url: "{{base_url}}/auth/login", body: { mode: "raw", raw: '{"email":"test@test.com","password":"password123"}', options: { raw: { language: "json" } } } } },
        { name: "Get Me", request: { method: "GET", url: "{{base_url}}/auth/me" } }
      ]
    },
    {
      name: "Admin",
      item: [
        { name: "Stats", request: { method: "GET", url: "{{base_url}}/admin/stats" } },
        { name: "Plans - Get All", request: { method: "GET", url: "{{base_url}}/admin/plans" } },
        { name: "Plans - Get By Id", request: { method: "GET", url: "{{base_url}}/admin/plans/{{plan_id}}" } },
        { name: "Plans - Create", request: { method: "POST", url: "{{base_url}}/admin/plans", body: { mode: "raw", raw: '{}', options: { raw: { language: "json" } } } } },
        { name: "Plans - Update", request: { method: "PUT", url: "{{base_url}}/admin/plans/{{plan_id}}", body: { mode: "raw", raw: '{}', options: { raw: { language: "json" } } } } },
        { name: "Plans - Delete", request: { method: "DELETE", url: "{{base_url}}/admin/plans/{{plan_id}}" } },
        { name: "Settings - Get", request: { method: "GET", url: "{{base_url}}/admin/settings" } },
        { name: "Settings - Update", request: { method: "PUT", url: "{{base_url}}/admin/settings", body: { mode: "raw", raw: '{"default_max_members":30}', options: { raw: { language: "json" } } } } },
        { name: "Transactions - Get All", request: { method: "GET", url: "{{base_url}}/admin/transactions" } },
        { name: "Users - Get All", request: { method: "GET", url: "{{base_url}}/admin/users" } },
        { name: "Users - Get By Id", request: { method: "GET", url: "{{base_url}}/admin/users/{{user_id}}" } },
        { name: "Users - Update Role", request: { method: "PUT", url: "{{base_url}}/admin/users/{{user_id}}", body: { mode: "raw", raw: '{"system_role":"SUPER_ADMIN"}', options: { raw: { language: "json" } } } } },
        { name: "Users - Delete", request: { method: "DELETE", url: "{{base_url}}/admin/users/{{user_id}}" } }
      ]
    },
    {
      name: "Payments",
      item: [
        { name: "Get Public Plans", request: { method: "GET", url: "{{base_url}}/payments/plans" } },
        { name: "Inquiry", request: { method: "POST", url: "{{base_url}}/payments/inquiry", body: { mode: "raw", raw: '{"treeId":"{{tree_id}}","planId":"{{plan_id}}","paymentMethod":"SP"}', options: { raw: { language: "json" } } } } },
        { name: "Duitku Callback", request: { method: "POST", url: "{{base_url}}/payments/duitku/callback", body: { mode: "urlencoded", urlencoded: [] } } },
        { name: "Get Transaction Status", request: { method: "GET", url: "{{base_url}}/payments/transactions/{{merchant_order_id}}" } }
      ]
    },
    {
      name: "Trees",
      item: [
        { name: "Create Tree", request: { method: "POST", url: "{{base_url}}/trees", body: { mode: "raw", raw: '{"nama_silsilah":"Keluarga Besar X"}', options: { raw: { language: "json" } } } } },
        { name: "Get My Trees", request: { method: "GET", url: "{{base_url}}/trees" } },
        { name: "Get Tree By Id", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}" } },
        { name: "Update Tree", request: { method: "PUT", url: "{{base_url}}/trees/{{tree_id}}", body: { mode: "raw", raw: '{"nama_silsilah":"Keluarga Besar Y"}', options: { raw: { language: "json" } } } } },
        { name: "Delete Tree", request: { method: "DELETE", url: "{{base_url}}/trees/{{tree_id}}" } }
      ]
    },
    {
      name: "Collaborators",
      item: [
        { name: "Get Collaborators", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/collaborators" } },
        { name: "Add Collaborator", request: { method: "POST", url: "{{base_url}}/trees/{{tree_id}}/collaborators", body: { mode: "raw", raw: '{"targetUserEmail":"x@y.com","role":"KONTRIBUTOR"}', options: { raw: { language: "json" } } } } },
        { name: "Update Collaborator Role", request: { method: "PUT", url: "{{base_url}}/trees/{{tree_id}}/collaborators/{{user_id}}", body: { mode: "raw", raw: '{"role":"VIEWER"}', options: { raw: { language: "json" } } } } },
        { name: "Remove Collaborator", request: { method: "DELETE", url: "{{base_url}}/trees/{{tree_id}}/collaborators/{{user_id}}" } }
      ]
    },
    {
      name: "Family Members",
      item: [
        { name: "Get Members", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/members" } },
        { name: "Get Canvas", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/canvas" } },
        { name: "Get Member By Id", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/members/{{member_id}}" } },
        { name: "Add Member", request: { method: "POST", url: "{{base_url}}/trees/{{tree_id}}/members", body: { mode: "raw", raw: '{"nama_lengkap":"Anak 1","jenis_kelamin":"L"}', options: { raw: { language: "json" } } } } },
        { name: "Update Member (Direct)", request: { method: "PUT", url: "{{base_url}}/trees/{{tree_id}}/members/{{member_id}}", body: { mode: "raw", raw: '{"version":1,"patch_data":{"nama_lengkap":"Anak 2"}}', options: { raw: { language: "json" } } } } },
        { name: "Delete Member", request: { method: "DELETE", url: "{{base_url}}/trees/{{tree_id}}/members/{{member_id}}" } }
      ]
    },
    {
      name: "Marriages",
      item: [
        { name: "Get Marriages", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/marriages" } },
        { name: "Add Marriage", request: { method: "POST", url: "{{base_url}}/trees/{{tree_id}}/marriages", body: { mode: "raw", raw: '{"suami_id":"","istri_id":""}', options: { raw: { language: "json" } } } } },
        { name: "Update Marriage", request: { method: "PUT", url: "{{base_url}}/trees/{{tree_id}}/marriages/{{marriage_id}}", body: { mode: "raw", raw: '{"tanggal_pernikahan":"2020-01-01"}', options: { raw: { language: "json" } } } } },
        { name: "Delete Marriage", request: { method: "DELETE", url: "{{base_url}}/trees/{{tree_id}}/marriages/{{marriage_id}}" } }
      ]
    },
    {
      name: "Pending Approvals",
      item: [
        { name: "Propose Change", request: { method: "POST", url: "{{base_url}}/trees/{{tree_id}}/approvals", body: { mode: "raw", raw: '{"target_member_id":"","target_version":1,"patch_data":{}}', options: { raw: { language: "json" } } } } },
        { name: "Get Approvals", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/approvals" } },
        { name: "Get Approval By Id", request: { method: "GET", url: "{{base_url}}/trees/{{tree_id}}/approvals/{{approval_id}}" } },
        { name: "Resolve Approval", request: { method: "POST", url: "{{base_url}}/trees/{{tree_id}}/approvals/{{approval_id}}/resolve", body: { mode: "raw", raw: '{"action":"APPROVED"}', options: { raw: { language: "json" } } } } },
        { name: "Delete Approval", request: { method: "DELETE", url: "{{base_url}}/trees/{{tree_id}}/approvals/{{approval_id}}" } }
      ]
    }
  ]
};

fs.writeFileSync('silsilah-api.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection updated successfully!');
