
import React from 'react';
import ReactDOM from 'react-dom/client';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
  })),
}));

test('renders App without crashing', () => {
  require('../index'); // will invoke the render logic
  expect(ReactDOM.createRoot).toHaveBeenCalled();
});
