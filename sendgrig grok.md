# SendGrid v3 API Reference for RAG

This document compiles the practical content from the SendGrid API reference documentation, cleaned and structured for Retrieval-Augmented Generation (RAG). Content is organized by main topics for easy retrieval. Only API endpoints, methods, paths, parameters, request bodies, response schemas, and examples are included. Non-practical elements have been removed.

## Senders

### Sender Identities API

#### Get Sender Identities
- **HTTP Method**: GET
- **Path**: /v3/senders
- **Parameters**: None
- **Request Body**: None
- **Response Schema**: JSON object containing details of verified Sender Identities
- **Example**:
  - Request: `GET /v3/senders`
  - Response: (Schema not detailed in content)

#### Update Sender Identity
- **HTTP Method**: PATCH
- **Path**: /v3/senders/{sender_id}
- **Parameters**: 
  - `sender_id`: ID of the sender identity to update
- **Request Body**: JSON object with updated details (e.g., contact information)
- **Response Schema**: JSON object confirming update
- **Example**:
  - Request: `PATCH /v3/senders/{sender_id}` with body like `{"address": "123 Main St"}`
  - Response: (Schema not detailed in content)

### Delete a Sender
- **HTTP Method**: DELETE
- **Path**: /v3/marketing/senders/{id}
- **Parameters**:
  - `id`: The unique identifier of the Sender.
- **Headers**:
  - Authorization: `Bearer <<YOUR_API_KEY_HERE>>`
  - on-behalf-of: optional
- **Request Body**: None
- **Response Schemas**:
  - **204:** Successfully deleted
  - **403:** Forbidden
  - **404:** Not Found
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = 1;
  const request = {
    url: `/v3/marketing/senders/${id}`,
    method: "DELETE",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Update a Sender
- **HTTP Method**: PATCH
- **Path**: /v3/marketing/senders/{id}
- **Parameters**:
  - `id`: The unique identifier of the Sender.
- **Request Body**:
  - `nickname`: optional
  - `from`: optional
  - `reply_to`: optional
  - `address`: optional
  - `address_2`: optional
  - `city`: optional
  - `state`: optional
  - `zip`: optional
  - `country`: optional
- **Example Request Body**:
  ```json
  {
    "nickname": "Example Orders",
    "from": {
      "email": "orders@example.com",
      "name": "Example Orders"
    },
    "reply_to": {
      "email": "support@example.com",
      "name": "Example Support"
    },
    "address": "1234 Fake St.",
    "address_2": "",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "United States"
  }
  ```
- **Response Schemas**:
  - **200**: Success
    - `id`: optional
    - `nickname`: optional
    - `from`: optional
    - `reply_to`: optional
    - `address`: optional
    - `address_2`: optional
    - `city`: optional
    - `state`: optional
    - `zip`: optional
    - `country`: optional
    - `verified`: optional
    - `locked`: optional
    - `updated_at`: optional
    - `created_at`: optional
  - **400**: Bad Request
  - **403**: Forbidden
  - **404**: Not Found

### Resend a Sender Verification
- **HTTP Method**: POST
- **Path**: /v3/marketing/senders/{id}/resend_verification
- **Parameters**:
  - `id`: The unique identifier of the Sender.
- **Headers**:
  - Authorization: `Bearer <<YOUR_API_KEY_HERE>>`
  - on-behalf-of: optional
- **Request Body**: None
- **Response Schemas**:
  - **204**: Successfully posted
  - **400**: Bad Request
  - **404**: Not Found
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = 1;
  const request = {
    url: `/v3/marketing/senders/${id}/resend_verification`,
    method: "POST",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Integrations

### Create an Integration
- **HTTP Method**: POST
- **Path**: /v3/marketing/integrations
- **Request Body**:
  | Property Name | Type          | Required | Description                                      |
  |---------------|---------------|----------|--------------------------------------------------|
  | destination   | enum<string>  | Yes      | Possible values: `Segment` |
  | filters       | object        | Yes      | Filters for email event forwarding. |
  | properties    | object        | Yes      | Properties for sending events to third-party. |
  | label         | string        | No       | Nickname for the Integration. Default: `Untitled Integration` |
- **Example Request Body**:
  ```json
  {
    "filters": {
      "email_events": ["click", "drop", "open", "processed", "delivered"]
    },
    "destination": "Segment",
    "label": "optional label",
    "properties": {
      "destination_region": "US",
      "write_key": "a123456"
    }
  }
  ```
- **Response Schemas**:
  - **201**: Successful
    - `integration_id`: optional
    - `user_id`: optional
    - `filters`: optional
    - `properties`: optional
    - `label`: optional
    - `destination`: optional
  - **400**: Bad Request
  - **403**: Forbidden
  - **500**: Internal Server Error

### Update Integration
- **HTTP Method**: PATCH
- **Path**: /v3/marketing/integrations/{id}
- **Parameters**:
  - `id`: The ID of the Integration to update.
- **Request Body**:
  - `destination`: optional
  - `filters`: optional
  - `properties`: optional
  - `label`: optional
- **Example Request Body**:
  ```json
  {
    "filters": {
      "email_events": ["processed", "open"]
    },
    "properties": {
      "write_key": "a123456",
      "destination_region": "US"
    },
    "label": "Untitled Integration",
    "destination": "Segment"
  }
  ```
- **Response Schemas**:
  - **200**: Successful
    - `integration_id`: optional
    - `user_id`: optional
    - `filters`: optional
    - `properties`: optional
    - `label`: optional
    - `destination`: optional
  - **400**: Bad Request
  - **403**: Forbidden
  - **404**: Not Found
  - **500**: Internal Server Error

## Contacts

### Export Contacts
- **HTTP Method**: POST
- **Path**: /v3/marketing/contacts/exports
- **Request Body**:
  - `list_ids`: optional
  - `segment_ids`: optional
  - `notifications`: optional
  - `file_type`: optional, Default: `csv`
  - `max_file_size`: optional, Default: `5000`
- **Response Schemas**:
  - **200**: Success
    - `id`: The ID of the export job.
  - **400**: Bad Request
  - **401**: Unauthorized
  - **403**: Forbidden
  - **404**: Not Found
  - **500**: Internal Server Error
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/marketing/contacts/exports`,
    method: "POST",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Search Contacts
- **HTTP Method**: POST
- **Path**: /v3/marketing/contacts/search
- **Request Body**:
  - `query`: required, SGQL search string.
- **Response Schema**:
  - `result`: optional
  - `contact_count`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    query: "email LIKE 'ENTER_COMPLETE_OR_PARTIAL_EMAIL_ADDRESS_HERE%' AND CONTAINS(list_ids, 'YOUR_LIST_IDs')",
  };

  const request = {
    url: `/v3/marketing/contacts/search`,
    method: "POST",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Import Contacts
- **HTTP Method**: PUT
- **Path**: /v3/marketing/contacts/imports
- **Request Body**:
  - `list_ids`: optional
  - `file_type`: required, Value: `csv`
  - `field_mappings`: required, Min items: 1
- **Response Schema**:
  - `job_id`: optional
  - `upload_uri`: optional
  - `upload_headers`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    file_type: "csv",
    field_mappings: ["e1_T"],
  };

  const request = {
    url: `/v3/marketing/contacts/imports`,
    method: "PUT",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete Contacts
- **HTTP Method**: DELETE
- **Path**: /v3/marketing/contacts
- **Query Parameters**:
  - `delete_all_contacts`: optional
  - `ids`: optional
- **Response Schemas**:
  - **202**: Success
    - `job_id`: optional
  - **400**: Bad Request
  - **401**: Unauthorized
  - **403**: Forbidden
  - **404**: Not Found
  - **500**: Internal Server Error
- **Example (Delete All Contacts)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { delete_all_contacts: "true" };

  const request = {
    url: `/v3/marketing/contacts`,
    method: "DELETE",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```
- **Example (Delete Specific Contacts)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { ids: "1, 2" };

  const request = {
    url: `/v3/marketing/contacts`,
    method: "DELETE",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Mail Send

### Send Email
- **HTTP Method**: POST
- **Path**: /v3/mail/send
- **Authentication**: Bearer Token
- **Request Body**: JSON with sender, recipient, subject, content, personalizations, attachments, templates, reply_to_list (mutually exclusive with reply_to), limit 1,000 emails.
- **Response Schema**: Not specified
- **Notes**:
  - Email size < 30MB
  - Recipients <= 1,000
  - Custom arguments < 10,000 bytes
  - No Unicode for `from` field
- **Compression**: Gzip for high volume, add `Content-Encoding: gzip`, max 30MB

### Errors
- Object type for headers must be string, not integers, Booleans, arrays.
- Headers cannot be empty strings.

## Teammates

### Invite Teammate
- **HTTP Method**: POST
- **Path**: /v3/teammates
- **Request Body**:
  - `email`: required
  - `scopes`: required (empty for admin)
  - `is_admin`: required, Default: false
- **Example**:
  ```json
  {
    "email": "teammate1@example.com",
    "scopes": ["user.profile.read", "user.profile.update"],
    "is_admin": false
  }
  ```
- **Response**:
  - **201**: Success
    - `token`: optional
    - `email`: optional
    - `scopes`: optional
    - `is_admin`: optional
  - **400**: Bad Request

### Delete Teammate
- **HTTP Method**: DELETE
- **Path**: /v3/teammates/{username}
- **Parameters**:
  - `username`: required
- **Response**:
  - **204**: Success
  - **404**: Not Found
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const username = "username";

  const request = {
    url: `/v3/teammates/${username}`,
    method: "DELETE",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve All Teammates
- **HTTP Method**: GET
- **Path**: /v3/teammates
- **Query Parameters**:
  - `limit`: optional, Default: 500
  - `offset`: optional, Default: 0
- **Response**:
  - **200**: Success
    - `result`: optional
- **Example (First Page, Default Size)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { limit: 500 };

  const request = {
    url: `/v3/teammates`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Lists

### Create List
- **HTTP Method**: POST
- **Path**: /v3/marketing/lists
- **Request Body**:
  - `name`: required, Min: 1, Max: 100
- **Response**:
  - **201**: Success
    - `id`: optional
    - `name`: optional
    - `contact_count`: optional
    - `_metadata`: optional
  - **400**: Bad Request
- **Example**:
  ```json
  {
    "name": "list-name"
  }
  ```

### Update List
- **HTTP Method**: PATCH
- **Path**: /v3/marketing/lists/{id}
- **Parameters**:
  - `id`: required
- **Request Body**:
  - `name`: optional
- **Response**:
  - **200**: Success
    - `id`: optional
    - `name`: optional
    - `contact_count`: optional
    - `_metadata`: optional
  - **400**: Bad Request
  - **404**: Not Found
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = "id";
  const data = {
    name: "updated-list-name",
  };

  const request = {
    url: `/v3/marketing/lists/${id}`,
    method: "PATCH",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete a List
- **HTTP Method**: DELETE
- **Path**: /v3/marketing/lists/{id}
- **Parameters**:
  - `id`: required
  - `delete_contacts`: optional, Default: false
- **Response**:
  - **200**: Accepted
  - **204**: Accepted
  - **404**: Not Found
- **Response Schema**:
  - `job_id`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = "id";

  const request = {
    url: `/v3/marketing/lists/${id}`,
    method: "DELETE",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Account Provisioning

### Create Account
- **HTTP Method**: POST
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-account-operations/create-account
- **Request Body**:
  - `profile`: optional
  - `offerings`: required
- **Example**:
  ```json
  {
    "profile": {
      "first_name": "Jane",
      "last_name": "Doe",
      "company_name": "Cake or Pie Bakery",
      "company_website": "www.example.com",
      "email": "jdoe@example.com",
      "phone": "+15555555555",
      "timezone": "Asia/Tokyo"
    },
    "offerings": [
      {
        "name": "milne.ei.pro-100k.v1",
        "type": "package",
        "quantity": 1
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "account_id": "sg2a2bcd3ef4ab5c67d8efab91c01de2fa"
  }
  ```

### Create Test Account
- **HTTP Method**: POST
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-account-operations/create-account
- **Custom Header**: `T-Test-Account: true`
- **Request Body**: Same as Create Account

### Update Account State
- **HTTP Method**: PUT
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-account-state-operations/update-account-state
- **Request Body**:
  - `state`: required, Possible values: `activated`, `deactivated`, `suspended`, `banned`, `indeterminate`
- **Example**:
  ```json
  {
    "state": "deactivated"
  }
  ```

### Get Account State
- **HTTP Method**: GET
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-account-state-operations/get-account-state

### List Offerings
- **HTTP Method**: GET
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-offering-operations/list-offerings

### Update Account Offerings
- **HTTP Method**: PUT
- **Path**: /docs/sendgrid/api-reference/account-provisioning-api-offering-operations/update-account-offerings
- **Request Body**:
  - `offerings`: required
- **Example**:
  ```json
  {
    "offerings": [
      {
        "name": "milne.ei.pro-100k.v1",
        "type": "package",
        "quantity": 1
      }
    ]
  }
  ```

## Designs

### Get Design
- **HTTP Method**: GET
- **Path**: /v3/designs/{id}
- **Parameters**:
  - `id`: required
- **Response**: 200, 400, 404
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";

  const request = {
    url: `/v3/designs/${id}`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete Design
- **HTTP Method**: DELETE
- **Path**: /v3/designs/{id}
- **Parameters**:
  - `id`: required
- **Response**: 204, 400, 404
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";

  const request = {
    url: `/v3/designs/${id}`,
    method: "DELETE",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Create Design
- **HTTP Method**: POST
- **Path**: /v3/designs
- **Request Body**:
  - `name`: optional
  - `editor`: optional, Possible values: `code`, `design`
  - `html_content`: required, Max: 1048576
  - `plain_content`: optional, Max: 1048576
- **Example Request Body**:
  ```json
  {
    "name": "Ahoy, World!",
    "editor": "design",
    "html_content": "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n<html data-editor-version=\"2\" class=\"sg-campaigns\" xmlns=\"http://www.w3.org/1999/xhtml\">\n    <head>\n      <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1\">\n      <!--[if !mso]><!-->\n      <meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\">\n      <!--<![endif]-->\n      <!--[if (gte mso 9)|(IE)]>\n      <xml>\n        <o:OfficeDocumentSettings>\n          <o:AllowPNG/>\n          <o:PixelsPerInch>96</o:PixelsPerInch>\n        </o:OfficeDocumentSettings>\n      </xml>\n      <![endif]-->\n      <!--[if (gte mso 9)|(IE)]>\n  <style type=\"text/css\">\n    body {width: 600px;margin: 0 auto;}\n    table {border-collapse: collapse;}\n    table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}\n    img {-ms-interpolation-mode: bicubic;}\n  </style>\n<![endif]-->\n      <style type=\"text/type\">\n    body, p, div {\n      font-family: arial,helvetica,sans-serif;\n      font-size: 14px;\n    }\n    body {\n      color: #000000;\n    }\n    body a {\n      color: #1188E6;\n      text-decoration: none;\n    }\n    p { margin: 0; padding: 0; }\n    table.wrapper {\n      width:100% !important;\n      table-layout: fixed;\n      -webkit-font-smoothing: antialiased;\n      -webkit-text-size-adjust: 100%;\n      -moz-text-size-adjust: 100%;\n      -ms-text-size-adjust: 100%;\n    }\n    img.max-width {\n      max-width: 100% !important;\n    }\n    .column.of-2 {\n      width: 50%;\n    }\n    .column.of-3 {\n      width: 33.333%;\n    }\n    .column.of-4 {\n      width: 25%;\n    }\n    ul ul ul ul  {\n      list-style-type: disc !important;\n    }\n    ol ol {\n      list-style-type: lower-roman !important;\n    }\n    ol ol ol {\n      list-style-type: lower-latin !important;\n    }\n    ol ol ol ol {\n      list-style-type: decimal !important;\n    }\n    @media screen and (max-width:480px) {\n      .preheader .rightColumnContent,\n      .footer .rightColumnContent {\n        text-align: left !important;\n      }\n      .preheader .rightColumnContent div,\n      .preheader .rightColumnContent span,\n      .footer .rightColumnContent div,\n      . 

(Note: The example html_content is truncated in the original content.)

## Alerts

### Update an Alert
- **HTTP Method**: PATCH
- **Path**: /v3/alerts/{alert_id}
- **Parameters**:
  - `alert_id`: required
- **Request Body**:
  - `email_to`: optional
  - `frequency`: optional
  - `percentage`: optional
- **Response**:
  - **200**: Success
    - `created_at`: optional
    - `email_to`: optional
    - `frequency`: optional
    - `id`: optional
    - `type`: optional
    - `updated_at`: optional
    - `percentage`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const alert_id = 42;
  const data = {
    email_to: "example@example.com",
  };

  const request = {
    url: `/v3/alerts/${alert_id}`,
    method: "PATCH",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Categories

### Retrieve All Categories
- **HTTP Method**: GET
- **Path**: /v3/categories
- **Query Parameters**:
  - `limit`: optional, Default: 50
  - `category`: optional
  - `offset`: optional, Default: 0
- **Response**:
  - Array of:
    - `category`: optional
- **400**: Bad Request
- **Example (First Page, Default Size)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { limit: 50 };

  const request = {
    url: `/v3/categories`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve Email Statistics for Categories
- **HTTP Method**: GET
- **Path**: /v3/categories/stats
- **Query Parameters**:
  - `start_date`: required
  - `end_date`: optional
  - `categories`: required
  - `aggregated_by`: optional
- **Response**:
  - Array of:
    - `date`: optional
    - `stats`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = {
    categories: "categories",
    start_date: "2009-07-06",
  };

  const request = {
    url: `/v3/categories/stats`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Sender Verification

### Completed Steps
- **HTTP Method**: GET
- **Path**: /v3/verified_senders/steps_completed
- **Request Body**: None
- **Response**:
  - `results`: optional
    - `domain_verified`: boolean
    - `sender_verified`: boolean
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/verified_senders/steps_completed`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Bounces

### Retrieve All Bounces
- **HTTP Method**: GET
- **Path**: /v3/suppression/bounces
- **Query Parameters**:
  - `start_time`: optional
  - `end_time`: optional
  - `limit`: optional, Max: 500
  - `offset`: optional
  - `email`: optional
- **Response**:
  - Array of:
    - `created`: optional
    - `email`: optional
    - `reason`: optional
    - `status`: optional
- **Example (First Page)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const headers = { Accept: "application/json" };

  const request = {
    url: `/v3/suppression/bounces`,
    method: "GET",
    headers: headers,
  };

  client.request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete Bounces
- **HTTP Method**: DELETE
- **Path**: /v3/suppression/bounces
- **Request Body**:
  - `delete_all`: optional
  - `emails`: optional
- **Response**: 204
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    delete_all: false,
  };

  const request = {
    url: `/v3/suppression/bounces`,
    method: "DELETE",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve a Bounce
- **HTTP Method**: GET
- **Path**: /v3/suppression/bounces/{email}
- **Parameters**:
  - `email`: required
- **Response**:
  - Array of:
    - `created`: optional
    - `email`: optional
    - `reason`: optional
    - `status`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const email = "brian12@example.net";
  const request = {
    url: `/v3/suppression/bounces/${email}`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve Bounces by Specific Classification
- **HTTP Method**: GET
- **Path**: /v3/suppression/bounces/classifications/{classification}
- **Parameters**:
  - `classification`: required, Possible values: `Content`, `Frequency or Volume Too High`, `Invalid Address`, `Mailbox Unavailable`, `Reputation`, `Technical Failure`, `Unclassified`
- **Query Parameters**:
  - `start_date`: optional
  - `end_date`: optional
- **Headers**:
  - `Accept`: optional, Default: `application/json`
- **Response**:
  - `result`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const classification = "Content";
  const headers = { Accept: "application/json" };

  const request = {
    url: `/v3/suppression/bounces/classifications/${classification}`,
    method: "GET",
    headers: headers,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Blocks

### Retrieve All Blocks
- **HTTP Method**: GET
- **Path**: /v3/suppression/blocks
- **Query Parameters**:
  - `start_time`: optional
  - `end_time`: optional
  - `limit`: optional
  - `offset`: optional
  - `email`: optional
- **Response**:
  - Array of:
    - `created`: optional
    - `email`: optional
    - `reason`: optional
    - `status`: optional
- **Example (First Page)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/suppression/blocks`,
    method: "GET",
  };

  client.request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete Blocks
- **HTTP Method**: DELETE
- **Path**: /v3/suppression/blocks
- **Request Body**:
  - `delete_all`: optional
  - `emails`: optional
- **Response**: 204
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    delete_all: false,
    emails: ["example1@example.com", "example2@example.com"],
  };

  const request = {
    url: `/v3/suppression/blocks`,
    method: "DELETE",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Suppressions

### Add Suppressions to a Suppression Group
- **HTTP Method**: POST
- **Path**: /v3/asm/groups/{group_id}/suppressions
- **Parameters**:
  - `group_id`: required
- **Request Body**:
  - `recipient_emails`: required
- **Response**:
  - `recipient_emails`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const group_id = "group_id";
  const data = {
    recipient_emails: ["test1@example.com", "test2@example.com"],
  };

  const request = {
    url: `/v3/asm/groups/${group_id}/suppressions`,
    method: "POST",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve All Suppressions
- **HTTP Method**: GET
- **Path**: /v3/asm/suppressions
- **Response**:
  - Array of:
    - `email`: optional
    - `group_id`: optional
    - `group_name`: optional
    - `created_at`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/asm/suppressions`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete a Suppression from a Suppression Group
- **HTTP Method**: DELETE
- **Path**: /v3/asm/groups/{group_id}/suppressions/{email}
- **Parameters**:
  - `group_id`: required
  - `email`: required
- **Response**: 204
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const group_id = "group_id";
  const email = "brian12@example.net";

  const request = {
    url: `/v3/asm/groups/${group_id}/suppressions/${email}`,
    method: "DELETE",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve All Global Suppressions
- **HTTP Method**: GET
- **Path**: /v3/suppression/unsubscribes
- **Query Parameters**:
  - `start_time`: optional
  - `end_time`: optional
  - `limit`: optional
  - `offset`: optional
  - `email`: optional
- **Response**:
  - Array of:
    - `created`: optional
    - `email`: optional
- **Example (First Page)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/suppression/unsubscribes`,
    method: "GET",
  };

  client.request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Spam Reports

### Retrieve All Spam Reports
- **HTTP Method**: GET
- **Path**: /v3/suppression/spam_reports
- **Query Parameters**:
  - `start_time`: optional
  - `end_time`: optional
  - `limit`: optional
  - `offset`: optional
  - `email`: optional
- **Response**:
  - Array of:
    - `created`: optional
    - `email`: optional
    - `ip`: optional
- **Example (First Page)**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/suppression/spam_reports`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Delete Spam Reports
- **HTTP Method**: DELETE
- **Path**: /v3/suppression/spam_reports
- **Request Body**:
  - `delete_all`: optional
  - `emails`: optional
- **Response**: 204
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    delete_all: false,
    emails: ["example1@example.com", "example2@example.com"],
  };

  const request = {
    url: `/v3/suppression/spam_reports`,
    method: "DELETE",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Statistics

### Get All Automation Stats
- **HTTP Method**: GET
- **Path**: /v3/marketing/stats/automations
- **Query Parameters**:
  - `automation_ids`: optional
  - `page_size`: optional, Default: 25
  - `page_token`: optional
- **Response**:
  - `results`: optional
  - `_metadata`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { page_size: 25 };

  const request = {
    url: `/v3/marketing/stats/automations`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve Email Statistics for Your Subuser
- **HTTP Method**: GET
- **Path**: /v3/subusers/stats
- **Query Parameters**:
  - `limit`: optional
  - `offset`: optional
  - `aggregated_by`: optional
  - `subusers`: required
  - `start_date`: required
  - `end_date`: optional
- **Response**:
  - `date`: optional
  - `stats`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = {
    subusers: "subusers",
    start_date: "2009-07-06",
  };

  const request = {
    url: `/v3/subusers/stats`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve Monthly Stats for All Subusers
- **HTTP Method**: GET
- **Path**: /v3/subusers/stats/monthly
- **Query Parameters**:
  - `date`: required
  - `subuser`: optional
  - `sort_by_metric`: optional, Default: `delivered`
  - `sort_by_direction`: optional, Default: `desc`
  - `limit`: optional, Default: 5
  - `offset`: optional, Default: 0
- **Response**:
  - `date`: optional
  - `stats`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = {
    date: "2009-07-06",
    limit: 5,
    sort_by_direction: "desc",
    sort_by_metric: "delivered",
  };

  const request = {
    url: `/v3/subusers/stats/monthly`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve Global Email Statistics
- **HTTP Method**: GET
- **Path**: /v3/stats
- **Query Parameters**:
  - `limit`: optional
  - `offset`: optional
  - `aggregated_by`: optional
  - `start_date`: required
  - `end_date`: optional
- **Response**:
  - Array of:
    - `date`: optional
    - `stats`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { start_date: "2009-07-06" };

  const request = {
    url: `/v3/stats`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Get All Single Sends Stats
- **HTTP Method**: GET
- **Path**: /v3/marketing/stats/singlesends
- **Query Parameters**:
  - `singlesend_ids`: optional
  - `page_size`: optional, Default: 25
  - `page_token`: optional
- **Response**:
  - `results`: optional
  - `_metadata`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { page_size: 25 };

  const request = {
    url: `/v3/marketing/stats/singlesends`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Export Single Send Stats
- **HTTP Method**: GET
- **Path**: /v3/marketing/stats/singlesends/export
- **Query Parameters**:
  - `ids`: optional
  - `timezone`: optional, Default: "UTC"
- **Response**: 200, CSV data
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = { timezone: "UTC" };

  const request = {
    url: `/v3/marketing/stats/singlesends/export`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Get Automation Click Tracking Stats by ID
- **HTTP Method**: GET
- **Path**: /v3/marketing/stats/automations/{id}/links
- **Parameters**:
  - `id`: required
- **Query Parameters**:
  - `group_by`: optional
  - `step_ids`: optional
  - `page_size`: optional, Default: 25
  - `page_token`: optional
- **Response**:
  - `results`: optional
  - `total_clicks`: optional
  - `_metadata`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";
  const queryParams = { page_size: 25 };

  const request = {
    url: `/v3/marketing/stats/automations/${id}/links`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Templates

### Retrieve Paged Transactional Templates
- **HTTP Method**: GET
- **Path**: /v3/templates
- **Query Parameters**:
  - `generations`: optional, Default: `legacy`
  - `page_size`: required
  - `page_token`: optional
- **Response**:
  - `result`: optional
  - `_metadata`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const queryParams = {
    generations: "legacy",
    page_size: 9.358,
  };

  const request = {
    url: `/v3/templates`,
    method: "GET",
    qs: queryParams,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Retrieve a Specific Transactional Template Version
- **HTTP Method**: GET
- **Path**: /v3/templates/{template_id}/versions/{version_id}
- **Parameters**:
  - `template_id`: required
  - `version_id`: required
- **Response**:
  - `warnings`: optional
  - `active`: optional
  - `name`: optional
  - `html_content`: optional
  - `plain_content`: optional
  - `generate_plain_content`: optional
  - `subject`: optional
  - `editor`: optional
  - `test_data`: optional
  - `id`: optional
  - `template_id`: optional
  - `updated_at`: optional
  - `thumbnail_url`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const template_id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";
  const version_id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";

  const request = {
    url: `/v3/templates/${template_id}/versions/${version_id}`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Segments

### Refresh Segment
- **HTTP Method**: POST
- **Path**: /v3/marketing/segments/2.0/refresh/{segment_id}
- **Parameters**:
  - `segment_id`: required
- **Request Body**:
  - `user_time_zone`: required
- **Response**: 202
  - `job_id`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const segment_id = "f15982c1-a82c-4e87-a6b2-a4a63b4b7644";
  const data = {
    user_time_zone: "America/Chicago",
  };

  const request = {
    url: `/v3/marketing/segments/2.0/refresh/${segment_id}`,
    method: "POST",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Get List of Segments
- **HTTP Method**: GET
- **Path**: /v3/marketing/segments
- **Query Parameters**:
  - `ids`: optional
  - `parent_list_ids`: optional
  - `no_parent_list_id`: optional, Default: false
- **Response**:
  - `results`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const request = {
    url: `/v3/marketing/segments`,
    method: "GET",
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Settings

### Update Forward Bounce Mail Settings
- **HTTP Method**: PATCH
- **Path**: /v3/mail_settings/forward_bounce
- **Request Body**:
  - `email`: optional
  - `enabled`: optional
- **Response**:
  - `email`: optional
  - `enabled`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    enabled: false,
    email: "john_doe@example.com",
  };

  const request = {
    url: `/v3/mail_settings/forward_bounce`,
    method: "PATCH",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

### Update Bounce Purge Mail Settings
- **HTTP Method**: PATCH
- **Path**: /v3/mail_settings/bounce_purge
- **Request Body**:
  - `enabled`: optional
  - `soft_bounces`: optional
  - `hard_bounces`: optional
- **Response**:
  - `enabled`: optional
  - `soft_bounces`: optional
  - `hard_bounces`: optional
- **Example**:
  ```javascript
  const client = require("@sendgrid/client");
  client.setApiKey(process.env.SENDGRID_API_KEY);

  const data = {
    enabled: false,
    soft_bounces: 1234,
    hard_bounces: 10,
  };

  const request = {
    url: `/v3/mail_settings/bounce_purge`,
    method: "PATCH",
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
    })
    .catch((error) => {
      console.error(error);
    });
  ```

## Email Address Validation

### Real Time Email Address Validation
- **HTTP Method**: Not specified
- **Path**: Not specified
- **Parameters**: Not specified
- **Request Body**: Not specified
- **Response Schema**: Not specified
- **Examples**: Not specified

### Bulk Email Address Validation
- **HTTP Method**: Not specified
- **Path**: Not specified
- **Parameters**: Not specified
- **Request Body**: Not specified
- **Response Schema**: Not specified
- **Examples**: Not specified

(Note: Insufficient details in source for this category.)