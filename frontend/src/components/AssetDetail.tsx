import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const CustomTooltip = ({ active, payload, label, assetName }: any) => {
    if (!active || !payload || !payload.length) return null;

    const validItems = payload.filter((p: any) => p.value !== null && p.value !== undefined);
    if (!validItems.length) return null;

    return (
        <div style={{ backgroundColor: '#111827', border: '1px solid #374151', padding: '8px 12px' }}>
            <p style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</p>
            {validItems.map((item: any) => (
                <p key={item.name} style={{ color: '#fff', margin: 0 }}>
                    {item.name === 'audPrice' ? 'Actual' : 'Forecast'}: {
                        assetName === 'asx200'
                            ? `${Number(item.value).toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts`
                            : `AU$${Number(item.value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                </p>
            ))}
        </div>
    );
};

export default function AssetDetail({ assetName, apiUrl, onBack, audRate }: AssetDetailProps) {
    const [data, setData] = useState<any>(null);
    const [sentimentHistory, setSentimentHistory] = useState<any[]>([]);
    const [accuracy, setAccuracy] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assetRes, predRes, sentRes, accRes] = await Promise.all([
                    fetch(`${apiUrl}/asset/${assetName}`),
                    fetch(`${apiUrl}/predictions/${assetName}`),
                    fetch(`${apiUrl}/sentiment/history/${assetName}`),
                    fetch(`${apiUrl}/predictions/accuracy/${assetName}`)
                ]);
                const assetJson = await assetRes.json();
                const predJson = await predRes.json();
                const sentJson = await sentRes.json();
                const accJson = await accRes.json();
                setData({
                    ...assetJson,
                    predictions: predJson.predictions || [],
                    disclaimer: predJson.disclaimer
                });
                setSentimentHistory(sentJson.history || []);
                setAccuracy(accJson);
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
                            <Tooltip content={<CustomTooltip assetName={assetName} />} />
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

            {/* Sentiment Trend Chart */}
            {sentimentHistory.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Sentiment Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={sentimentHistory}>
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                tickFormatter={(val) => val.slice(5)}
                            />
                            <YAxis
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                domain={[0, 100]}
                                tickFormatter={(val) => `${val}%`}
                                width={45}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                                labelStyle={{ color: '#9ca3af' }}
                                formatter={(value: any) => [`${value}%`]}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="negative_pct"
                                stackId="1"
                                stroke="#ef4444"
                                fill="#ef444433"
                                name="Negative"
                            />
                            <Area
                                type="monotone"
                                dataKey="positive_pct"
                                stackId="2"
                                stroke="#22c55e"
                                fill="#22c55e33"
                                name="Positive"
                            />
                            <Area
                                type="monotone"
                                dataKey="neutral_pct"
                                stackId="3"
                                stroke="#6b7280"
                                fill="#6b728033"
                                name="Neutral"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}


            {/* Prediction Accuracy Tracker */}
            {accuracy && accuracy.predictions?.length > 0 && (() => {

                // Get Monday of any given date's calendar week
                const getWeekMonday = (dateStr: string): string => {
                    const d = new Date(dateStr);
                    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
                    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
                    d.setDate(d.getDate() + diff);
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                };

                // Get Monday of current real-world week
                const today = new Date();
                const todayDay = today.getDay();
                const todayDiff = todayDay === 0 ? -6 : 1 - todayDay;
                today.setDate(today.getDate() + todayDiff);
                const thisWeekMonday = today.toISOString().split('T')[0];

                // Split by calendar week boundary
                const currentWeek = accuracy.predictions.filter((p: any) =>
                    getWeekMonday(p.date) === thisWeekMonday
                );
                const historical = accuracy.predictions.filter((p: any) =>
                    getWeekMonday(p.date) < thisWeekMonday
                );

                // Group historical into calendar weeks (Mon–Fri blocks)
                const weekMap: { [key: string]: any[] } = {};
                historical.forEach((p: any) => {
                    const monday = getWeekMonday(p.date);
                    if (!weekMap[monday]) weekMap[monday] = [];
                    weekMap[monday].push(p);
                });

                // Sort weeks most recent first
                const historicalWeeks: any[][] = Object.keys(weekMap)
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                    .map(key => weekMap[key]);

                const currentRows = activePage === 0
                    ? currentWeek
                    : historicalWeeks[activePage - 1] || [];

                const formatPrice = (price: number) =>
                    assetName === 'asx200'
                        ? `${price.toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts`
                        : audRate
                            ? `AU$${(price * audRate).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `$${price}`;

                // Avg error for current page
                const pageErrors = currentRows
                    .filter((p: any) => p.error_pct !== null)
                    .map((p: any) => p.error_pct);
                const pageAvgError = pageErrors.length > 0
                    ? (pageErrors.reduce((a: number, b: number) => a + b, 0) / pageErrors.length).toFixed(2)
                    : null;

                return (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Prediction Accuracy</h2>
                            {pageAvgError !== null ? (
                                <span className="text-sm text-gray-400">
                                    Avg error: <span className="text-white font-bold">{pageAvgError}%</span>
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500 italic">Awaiting actual prices</span>
                            )}
                        </div>

                        {/* Pagination Buttons */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            <button
                                onClick={() => setActivePage(0)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activePage === 0
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                This Week
                            </button>
                            {historicalWeeks.map((_: any, idx: number) => (
                                <button
                                    key={idx + 1}
                                    onClick={() => setActivePage(idx + 1)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activePage === idx + 1
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                                        <th className="text-left py-2">Date</th>
                                        <th className="text-right py-2">Predicted</th>
                                        <th className="text-right py-2">Actual</th>
                                        <th className="text-right py-2">Error</th>
                                        <th className="text-right py-2">Model R²</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRows.map((p: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-800 last:border-0">
                                            <td className="py-2 text-gray-300">{p.date}</td>
                                            <td className="py-2 text-right text-gray-300">
                                                {formatPrice(p.predicted_price)}
                                            </td>
                                            <td className="py-2 text-right text-gray-300">
                                                {p.actual_price
                                                    ? formatPrice(p.actual_price)
                                                    : <span className="text-gray-600 italic">pending</span>
                                                }
                                            </td>
                                            <td className="py-2 text-right">
                                                {p.error_pct !== null
                                                    ? <span className={p.error_pct < 2 ? 'text-green-400' : p.error_pct < 5 ? 'text-yellow-400' : 'text-red-400'}>
                                                        {p.error_pct}%
                                                    </span>
                                                    : <span className="text-gray-600 italic">—</span>
                                                }
                                            </td>
                                            <td className="py-2 text-right text-gray-500">{p.model_r2}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

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
                                    <p className="text-gray-600 text-xs mt-1">
                                        {h.source} · relevance {(h.relevance * 100).toFixed(0)}%
                                        {h.published_at && ` · ${new Date(h.published_at).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}