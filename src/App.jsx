import React, { useState } from 'react';

const API_BASE = 'https://builder.impromptu-labs.com/api_tools';
const API_HEADERS = {
  'Authorization': 'Bearer pas574e2plpmclesozq',
  'Content-Type': 'application/json'
};

const WebPageSummarizer = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [apiLogs, setApiLogs] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [createdObjects, setCreatedObjects] = useState([]);

  const logApiCall = (method, endpoint, data, response) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      data,
      response,
      id: Date.now()
    };
    setApiLogs(prev => [...prev, logEntry]);
  };

  const deleteObjects = async () => {
    for (const objectName of createdObjects) {
      try {
        const response = await fetch(`${API_BASE}/objects/${objectName}`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
        logApiCall('DELETE', `/objects/${objectName}`, null, { status: response.status });
      } catch (error) {
        logApiCall('DELETE', `/objects/${objectName}`, null, { error: error.message });
      }
    }
    setCreatedObjects([]);
    setSummary('Objects deleted successfully');
  };

  const summarizeUrl = async () => {
    if (!url.trim()) {
      setSummary('Please enter a URL');
      return;
    }

    setLoading(true);
    setCurrentStep(2);
    setProgress(0);
    setSummary('');
    setApiLogs([]);
    setRawData(null);

    try {
      // Step 1: Ingest the URL data
      setProgress(33);
      const ingestPayload = {
        created_object_name: 'webpage_content',
        data_type: 'urls',
        input_data: [url]
      };

      const ingestResponse = await fetch(`${API_BASE}/input_data`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(ingestPayload)
      });

      const ingestResult = await ingestResponse.json();
      logApiCall('POST', '/input_data', ingestPayload, ingestResult);

      if (!ingestResponse.ok) {
        throw new Error(`Failed to fetch webpage: ${ingestResponse.status} - ${ingestResult.detail || 'Unknown error'}`);
      }

      setCreatedObjects(prev => [...prev, 'webpage_content']);

      // Step 2: Apply summarization prompt
      setProgress(66);
      const promptPayload = {
        created_object_names: ['webpage_summary'],
        prompt_string: 'Provide a single, clear sentence that summarizes the main content and purpose of this webpage: {webpage_content}',
        inputs: [{
          input_object_name: 'webpage_content',
          mode: 'combine_events'
        }]
      };

      const promptResponse = await fetch(`${API_BASE}/apply_prompt`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(promptPayload)
      });

      const promptResult = await promptResponse.json();
      logApiCall('POST', '/apply_prompt', promptPayload, promptResult);

      if (!promptResponse.ok) {
        throw new Error(`Failed to generate summary: ${promptResponse.status} - ${promptResult.detail || 'Unknown error'}`);
      }

      setCreatedObjects(prev => [...prev, 'webpage_summary']);

      // Step 3: Get the summary result
      setProgress(100);
      const resultResponse = await fetch(`${API_BASE}/return_data/webpage_summary`, {
        method: 'GET',
        headers: API_HEADERS
      });

      const resultData = await resultResponse.json();
      logApiCall('GET', '/return_data/webpage_summary', null, resultData);

      if (!resultResponse.ok) {
        throw new Error(`Failed to retrieve summary: ${resultResponse.status} - ${resultData.detail || 'Unknown error'}`);
      }

      setRawData(resultData);
      setSummary(resultData.text_value || 'No summary generated');
      setCurrentStep(3);

    } catch (error) {
      setSummary(`Error: ${error.message}`);
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setUrl('');
    setSummary('');
    setProgress(0);
    setApiLogs([]);
    setRawData(null);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Web Page Summarizer
              </h1>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step 
                        ? 'bg-primary-600' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: URL Input */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Enter URL to Summarize
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Paste the URL of the webpage you'd like to summarize
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    aria-label="Enter URL to summarize"
                  />
                </div>

                <button
                  onClick={summarizeUrl}
                  disabled={!url.trim() || loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
                  aria-label="Start summarization process"
                >
                  Summarize Page
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <div className="spinner mx-auto mb-6"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Processing Your Request
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Fetching and analyzing the webpage content...
              </p>
              
              <div className="max-w-md mx-auto mb-6">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {progress}% complete
                </p>
              </div>

              <button
                onClick={() => {
                  setLoading(false);
                  setCurrentStep(1);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Step 3: Results */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Summary Result
                  </h2>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">URL:</p>
                    <p className="text-gray-900 dark:text-white break-all">{url}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Summary:</p>
                    <p className="text-gray-900 dark:text-white leading-relaxed">{summary}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={resetFlow}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-xl transition-colors duration-200"
                >
                  Summarize Another Page
                </button>
                
                <button
                  onClick={() => setRawData(rawData ? null : rawData)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-xl transition-colors duration-200"
                >
                  {rawData ? 'Hide' : 'Show'} Raw API Data
                </button>
                
                <button
                  onClick={deleteObjects}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-xl transition-colors duration-200"
                  disabled={createdObjects.length === 0}
                >
                  Delete API Objects
                </button>
              </div>
            </div>
          )}

          {/* Raw Data Display */}
          {rawData && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Raw API Response
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-sm overflow-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          )}

          {/* API Logs */}
          {apiLogs.length > 0 && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                API Call Logs
              </h3>
              <div className="space-y-4 max-h-96 overflow-auto">
                {apiLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {log.method} {log.endpoint}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.data && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Request:</p>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Response:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto">
                        {JSON.stringify(log.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebPageSummarizer;
