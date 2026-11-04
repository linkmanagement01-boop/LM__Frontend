import React from 'react';
import { Layout } from '../components/layout/Layout';
import { ChatPage } from '../../components/ChatPage';

// manager pages wrap themselves in the manager Layout (sidebar + violet theme)
export function Threads() {
  return (
    <Layout>
      <ChatPage userRole="Manager" />
    </Layout>
  );
}

export default Threads;
