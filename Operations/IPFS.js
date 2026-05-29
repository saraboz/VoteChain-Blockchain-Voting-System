const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { error } = require('console');

// Pinata API keys (replace with your own)
const PINATA_API_KEY = '91bc51bd00c2587e6edf';
const PINATA_API_SECRET = '18f1f4b1343b3611f6aaf9c9a4e9b726c58f7853ef6b8e0b0ff38ba4dd67aba6';

const usersTable = {
    users: [
        { id: 1, name: "John Doe", age: 19 },
        { id: 3, name: "joe Mama", age: 32 },
        { id: 2, name: "jeen Doe", age: 23 },
    ]
};

const ipfsCID = 'QmRT3K8A5eZtDUVdtzszQhFCXSAgjzgXd3RncBzFmsqZ6B';

async function fetchDataFromIPFS(cid) {
    try {
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);

        const data = response.data;
        // console.log('Fetched data from IPFS: ', data);

        // console.log('Users table: ', data.users);
        data.users.forEach(user => {
            console.log(`User ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
        });
        return data;
    } catch {
        console.error('Error fetching data from IPFS: ', error);
    }
}

// fetchDataFromIPFS(ipfsCID);

function updateUsername(data, userId, newUsername) {
    const user = data.users.find(u => u.id === userId);
    if (user) {
        user.name = newUsername;
    } else {
        throw new Error(`User with id ${userId} not found`);
    }
    return data;
}

function saveDataToFile(data, filename) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

async function uploadFileToPinata(filePath, fileName) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), fileName);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
        headers: {
            ...form.getHeaders(),
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_API_SECRET,
        },
    });

    return response.data;
}

async function updateUserAndUpload(cid, userId, newUsername) {
    try {
        const originalData = await fetchDataFromIPFS(cid);
        const updatedData = updateUsername(originalData, userId, newUsername);
        const filePath = './credentials.json';
        const fileName = 'credentials.json';

        saveDataToFile(updatedData, filePath);

        const result = await uploadFileToPinata(filePath, fileName);
        console.log('✅ Updated file uploaded.');
        console.log('New CID:', result.IpfsHash);
        console.log('Preview URL:', `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

fetchDataFromIPFS('Qma51mdGM9m7CQu2WCwRc7n7f3ae1gJDwX16S9XtR8HC7R');


// Make table into file then Upload

// fs.writeFileSync('credentials.json', JSON.stringify(usersTable, null, 2));

// async function uploadJSONToPinata(filePath, fileName) {
//     const form = new FormData();

//     form.append('file', fs.createReadStream(filePath), fileName);

//     try {
//         const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
//             headers:{
//                 ...form.getHeaders(),
//                 pinata_api_key: PINATA_API_KEY,
//                 pinata_secret_api_key: PINATA_API_SECRET,
//             },
//         });
//         console.log('File uploaded successfully: ', response.data);
//         return response.data;

//     } catch (err){
//         console.error('Error uploading file to pinata: ', error);
//         throw error;
//     }
// }

// const filePath = './credentials.json', fileName = 'credentials.json';

// uploadJSONToPinata(filePath, fileName)
//     .then(data => {
//         console.log('file uploaded with name: ', fileName);
//         console.log('IPFS CID (HASH): ', data.IpfsHash);
//     }).catch(err =>{
//         console.error('Failed to upload file: ', err);
//     });


//Upload file

// uploadJSONToPinata(usersTable).then(data => {
//     console.log('IPFS CID (Hash) for users table: ', data.IpfsHash)
// }).catch(err => {
//     console.error('Failed to upload JSON', err);
// });

// // Function to upload file to Pinata
// async function uploadFileToPinata(filePath) {
//   const form = new FormData();
//   form.append('file', fs.createReadStream(filePath));

//   try {
//     const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
//       headers: {
//         ...form.getHeaders(),
//         pinata_api_key: PINATA_API_KEY,
//         pinata_secret_api_key: PINATA_API_SECRET,
//       },
//     });

//     console.log('File uploaded successfully:', response.data);
//     return response.data; // Contains the IPFS hash
//   } catch (error) {
//     console.error('Error uploading file to Pinata:', error);
//     throw error;
//   }
// }

// // Example usage
// uploadFileToPinata('./trial.txt')
//   .then(data => {
//     console.log('IPFS CID (Hash):', data.IpfsHash);
//   })
//   .catch(err => {
//     console.error('Failed to upload file:', err);
//   });
