# Optional: Automatic logo upload via Microsoft Graph API
# Uncomment to enable automatic logo upload after application creation

# resource "null_resource" "upload_logo" {
#   # Only run if logo file exists
#   count = fileexists("${path.module}/../public/assets/logo.png") ? 1 : 0
#   
#   # Depend on the application being created
#   depends_on = [azuread_application.datadog_vending_machine]
#   
#   # Trigger when application changes
#   triggers = {
#     application_id = azuread_application.datadog_vending_machine.application_id
#     logo_file_hash = filemd5("${path.module}/../public/assets/logo.png")
#   }
#   
#   provisioner "local-exec" {
#     command = "${path.module}/../scripts/upload-logo.sh ${azuread_application.datadog_vending_machine.application_id} ${path.module}/../public/assets/logo.png"
#     
#     # Set working directory
#     working_dir = path.module
#     
#     # Only run on create and update
#     when = create
#   }
#   
#   # Optional: Remove logo on destroy (though Azure AD will keep it)
#   # provisioner "local-exec" {
#   #   when    = destroy
#   #   command = "echo 'Logo remains in Azure AD after Terraform destroy'"
#   # }
# }

# Output logo upload status
# output "logo_upload_status" {
#   description = "Status of logo upload"
#   value = length(resource.null_resource.upload_logo) > 0 ? "✅ Logo uploaded automatically via Microsoft Graph API" : "ℹ️ Logo not found - run ./scripts/generate-logo.sh first"
# } 