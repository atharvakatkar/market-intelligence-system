import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AssetDetail from './components/AssetDetail';

const API_URL = 'https://market-intelligence-system-tau.vercel.app';

export interface Asset {
    asset: string;
    volatility_score: number;
    volatility_level: string;
    color: string;
    latest_price: number;
    sentiment_score: number;
    momentum_score: number;
    trend_score: number;
    analysed_at: string;
}

function App() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [audRate, setAudRate] = useState<number | null>(null);
    const [lagAnalysis, setLagAnalysis] = useState<any>(null);
    const [lastPipelineRun, setLastPipelineRun] = useState<any>(null);


    const fetchAssets = async () => {
        try {
            const [assetsRes, rateRes, lagRes, pipelineRes] = await Promise.all([
                fetch(`${API_URL}/assets`),
                fetch(`${API_URL}/exchange-rate`),
                fetch(`${API_URL}/lag-analysis`),
                fetch(`${API_URL}/pipeline/last-run`)
            ]);
            const assetsData = await assetsRes.json();
            const rateData = await rateRes.json();
            const lagData = await lagRes.json();
            const pipelineData = await pipelineRes.json();
            setAssets(assetsData.assets);
            if (rateData.usd_aud) setAudRate(rateData.usd_aud);
            if (lagData.lag_analysis) setLagAnalysis(lagData.lag_analysis);
            setLastPipelineRun(pipelineData);
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        const interval = setInterval(fetchAssets, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading market intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {selectedAsset ? (
                <AssetDetail
                    assetName={selectedAsset}
                    apiUrl={API_URL}
                    onBack={() => setSelectedAsset(null)}
                    audRate={audRate}
                />
            ) : (
                <Dashboard
                    assets={assets}
                    lastUpdated={lastUpdated}
                    onSelectAsset={setSelectedAsset}
                    onRefresh={fetchAssets}
                    audRate={audRate}
                    lagAnalysis={lagAnalysis}
                    lastPipelineRun={lastPipelineRun}
                />
            )}
        </div>
    );
}

export default App;