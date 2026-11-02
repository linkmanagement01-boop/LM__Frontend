import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { TrafficSuggestionsPage } from '../../../components/TrafficSuggestions';

/** Sites → Suggestions: growing rejected sites + automatic rejections from Ahrefs checks */
export function SiteSuggestions() {
  return (
    <Layout>
      <div className="p-6">
        <TrafficSuggestionsPage role="manager" />
      </div>
    </Layout>
  );
}

export default SiteSuggestions;
