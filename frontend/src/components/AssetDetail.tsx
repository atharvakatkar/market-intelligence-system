import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AssetDetailProps {
    assetName: string;
    apiUrl: string;
    onBack: () => void;
    audRate: number | null;
}

const SENTIMENT_COLORS: Record<string, string> = {
    positive: 'text-green-400 bg-green-400/10',
    negative: 'text-red-400 bg-red-400/10',
    neutral: 'text-gray-400 bg-gray-400/10'
};

const ASSET_LABELS: Record<string, string> = {
    gold: 'Gold',
    silver: 'Silver',
    oil: 'Crude Oil',
    asx200: 'ASX 200'
};

const COLOR_MAP: Record<string, string> = {
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444'
};

export default function AssetDetail({ assetName, apiUrl, onBack, audRate }: AssetDetailProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assetRes, predRes] = await Promise.all([
                    fetch(`${apiUrl}/asset/${assetName}`),
                    fetch(`${apiUrl}/predictions/${assetName}`)
                ]);
                const assetJson = await assetRes.json();
                const predJson = await predRes.json();
                setData({
                    ...assetJson,
                    predictions: predJson.predictions || [],
                    disclaimer: predJson.disclaimer
                });
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch asset data:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, [assetName, apiUrl]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!data) return null;

    const vol = data.volatility;

    const priceData = [...(data.prices || [])].reverse().map((p: any) => ({
        date: p.date,
        audPrice: audRate && assetName !== 'asx200' ? parseFloat((p.close * audRate).toFixed(2)) : p.close,
        predictedPrice: null
    }));

    const predictionData = (data.predictions || []).map((p: any) => ({
        date: p.date,
        audPrice: null,
        predictedPrice: audRate && assetName !== 'asx200'
            ? parseFloat((p.predicted_price * audRate).toFixed(2))
            : p.predicted_price
    }));

    const chartData = [...priceData, ...predictionData];

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">{ASSET_LABELS[assetName]}</h1>
                    <p className="text-gray-400 mt-1">Detailed sentiment and price analysis</p>
                </div>
            </div>

            {/* Volatility Summary */}
            {vol && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        {
                            label: 'Current Price',
                            value: assetName === 'asx200'
                                ? `${vol.latest_price?.toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts`
                                : audRate
                                    ? `AU$${(vol.latest_price * audRate).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / US$${vol.latest_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `US$${vol.latest_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        },
                        { label: 'Volatility Score', value: `${(vol.score * 100).toFixed(1)}%` },
                        { label: 'Risk Level', value: vol.level },
                        { label: 'Sentiment Score', value: `${(vol.sentiment_score * 100).toFixed(1)}%` }
                    ].map(item => (
                        <div key={item.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                            <p className="text-xl font-bold text-white">{item.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Price Chart */}
            {priceData.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Price History (30 days) + 10 Day Forecast
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                tickFormatter={(val) => val.slice(5)}
                            />
                            <YAxis
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                domain={['auto', 'auto']}
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                                labelStyle={{ color: '#9ca3af' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any, name: any) => {
                                    const label = name === 'audPrice' ? 'Actual' : 'Forecast';
                                    if (assetName === 'asx200') {
                                        return [`${Number(value).toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts`, label];
                                    }
                                    return [`AU$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label];
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="audPrice"
                                stroke={vol ? COLOR_MAP[vol.color] : '#3b82f6'}
                                strokeWidth={2}
                                dot={{ r: 3, fill: vol ? COLOR_MAP[vol.color] : '#3b82f6' }}
                                activeDot={{ r: 5 }}
                                connectNulls={false}
                                name="audPrice"
                            />
                            <Line
                                type="monotone"
                                dataKey="predictedPrice"
                                stroke="#6366f1"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 3, fill: '#6366f1' }}
                                activeDot={{ r: 5 }}
                                connectNulls={false}
                                name="predictedPrice"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    {data.disclaimer && (
                        <p className="text-xs text-gray-500 mt-3 italic">{data.disclaimer}</p>
                    )}
                </div>
            )}

            {/* Headlines */}
            {data.headlines?.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">Latest Headlines</h2>
                    <div className="space-y-3">
                        {data.headlines.map((h: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${SENTIMENT_COLORS[h.sentiment]}`}>
                                    {h.sentiment}
                                </span>
                                <div>
                                    <p className="text-gray-300 text-sm">{h.headline}</p>
                                    <p className="text-gray-600 text-xs mt-1">{h.source} · relevance {(h.relevance * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}