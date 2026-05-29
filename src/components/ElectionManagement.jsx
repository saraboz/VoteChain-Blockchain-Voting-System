import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Card, Table, Alert } from 'react-bootstrap';

const API_URL = 'http://localhost:3001';

const ElectionManagement = () => {
  const [electionId, setElectionId] = useState('');
  const [countries, setCountries] = useState([]);
  const [newCountry, setNewCountry] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    // Get the connected wallet address
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setWallet(accounts[0]);
          }
        })
        .catch(error => console.error('Error fetching accounts:', error));
    }
  }, []);

  useEffect(() => {
    // Fetch countries for entered election ID when it changes
    if (electionId) {
      fetchCountries(electionId);
    }
  }, [electionId]);

  const fetchCountries = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/elections/${id}/countries`);
      setCountries(response.data.countries || []);
      setMessage({ text: `Countries loaded for election ID: ${id}`, type: 'success' });
    } catch (error) {
      console.error('Error fetching countries:', error);
      setMessage({ text: `Failed to fetch countries: ${error.response?.data?.error || error.message}`, type: 'danger' });
      setCountries([]);
    }
  };

  const handleAddCountry = async (e) => {
    e.preventDefault();
    
    if (!electionId) {
      setMessage({ text: 'Please enter an election ID first', type: 'warning' });
      return;
    }
    
    if (!newCountry.trim()) {
      setMessage({ text: 'Please enter a country name', type: 'warning' });
      return;
    }
    
    try {
      await axios.post(`${API_URL}/elections/${electionId}/countries`, {
        country: newCountry,
        from: wallet
      });
      
      setMessage({ text: `${newCountry} added to eligible countries for election ${electionId}`, type: 'success' });
      setNewCountry('');
      fetchCountries(electionId);
    } catch (error) {
      console.error('Error adding country:', error);
      setMessage({ 
        text: `Failed to add country: ${error.response?.data?.error || error.message}`, 
        type: 'danger' 
      });
    }
  };

  return (
    <Container className="mt-4">
      <h2>Election Country Management</h2>
      
      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ text: '', type: '' })} dismissible>
          {message.text}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Enter Election ID</Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>Election ID</Form.Label>
                <Form.Control 
                  type="text" 
                  value={electionId} 
                  onChange={(e) => setElectionId(e.target.value)}
                  placeholder="Enter election ID" 
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {electionId && (
        <>
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>Add Eligible Country</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleAddCountry}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={newCountry} 
                        onChange={(e) => setNewCountry(e.target.value)} 
                        placeholder="Enter country name"
                      />
                    </Form.Group>
                    <Button variant="primary" type="submit">
                      Add Country
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col>
              <Card>
                <Card.Header>Eligible Countries for Election {electionId}</Card.Header>
                <Card.Body>
                  {countries.length > 0 ? (
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Country Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countries.map((country, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{country}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p>No eligible countries added yet.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default ElectionManagement; 