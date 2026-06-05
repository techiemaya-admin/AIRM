import axios from 'axios';

const token = process.env.GITHUB_TOKEN;
const projectId = 'PVT_kwHODQ7Kq84BV82Q'; // prasad-s-portfolio-hub

// Step 1: Get fields
const fieldsQuery = `
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name }
            }
          }
        }
      }
    }
  }
`;

const r = await axios({
  url: 'https://api.github.com/graphql',
  method: 'post',
  headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
  data: { query: fieldsQuery, variables: { projectId } }
});

const allFields = r.data.data?.node?.fields?.nodes || [];
console.log('All field nodes raw:', JSON.stringify(allFields, null, 2));

const statusField = allFields.find(f => f && f.name === 'Status');
console.log('\nStatus field:', JSON.stringify(statusField, null, 2));

// Step 2: Get items to find a real item ID
const itemsQuery = `
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 10) {
          nodes {
            id
            fieldValues(first: 8) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2FieldCommon { name } }
                }
              }
            }
            content {
              ... on DraftIssue { title }
            }
          }
        }
      }
    }
  }
`;

const r2 = await axios({
  url: 'https://api.github.com/graphql',
  method: 'post',
  headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
  data: { query: itemsQuery, variables: { projectId } }
});

const items = r2.data.data?.node?.items?.nodes || [];
console.log('\nItems:');
items.forEach(i => {
  const status = i.fieldValues?.nodes?.find(fv => fv?.field?.name === 'Status');
  console.log(`  [${i.id}] "${i.content?.title}" → Status: ${status?.name || 'none'}`);
});

// Step 3: Try to update first item to "Done"
if (statusField && items.length > 0) {
  const item = items[0];
  const doneOption = statusField.options.find(o => o.name === 'Done');
  console.log(`\nTesting: Move "${item.content?.title}" → Done (option: ${doneOption?.id})`);

  if (doneOption) {
    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectItem { id }
        }
      }
    `;

    const r3 = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      data: { query: mutation, variables: { projectId, itemId: item.id, fieldId: statusField.id, optionId: doneOption.id } }
    });
    console.log('Update result:', JSON.stringify(r3.data, null, 2));
  }
}
