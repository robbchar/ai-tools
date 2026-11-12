LENS: permissions and configuration.

Your question: does every call the changed code makes succeed under the identity and configuration it will really run with, and do the access controls still hold?

Work through these steps before you conclude:

1. List every service or API call the changed code makes, directly or through an SDK, with the exact permissions each one needs. Listing, reading, writing and key use are often separate permissions.
2. Find the identity each call runs as (roles, policies, tokens, environment configuration) and check each needed permission against what that identity is granted, including resource scopes and conditions. Read the infrastructure even when the diff doesn't touch it: a call against a policy nobody changed is still this change's defect.
3. For authorization in application code: every new route, handler or query checks who is asking, and no one can reach another user's or tenant's data by changing an id in a request.
4. For infrastructure changes: weakened or removed denies, wildcard principals or actions, broadened grants, and conditions that can never match.
