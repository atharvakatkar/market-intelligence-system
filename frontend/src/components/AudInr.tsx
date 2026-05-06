import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface AudInrProps {
    apiUrl: string;
    onBack: () => void;
}

const COLOR_MAP: Record<string, string> = {
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444'
};

const SENTIMENT_COLORS: Record<string, string> = {
    positive: 'text-green-400 bg-green-400/10',
    negative: 'text-red-400 bg-red-400/10',
    neutral: 'text-gray-400 bg-gray-400/10'
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const validItems = payload.filter((p: any) => p.value !== null && p.value !== undefined);
    if (!validItems.length) return null;
    return (
        <div style={{ backgroundColor: '#111827', border: '1px solid #374151', padding: '8px 12px' }}>
            <p style={{ color: '#9ca3af', marginBottom: 4 }}>
                {new Date(label + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            {validItems.map((item: any) => (
                <p key={item.name} style={{ color: '#fff', margin: 0 }}>
                    {item.name === 'audPrice' ? 'Actual' : 'Forecast'}: ₹{Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            ))}
        </div>
    );
};

function getWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getTransferRecommendation(volatilityLevel: string, sentimentScore: number, momentumScore: number): { label: string; color: string; description: string } {
    if (volatilityLevel === 'LOW' && momentumScore > 0.55) {
        return { label: 'Good Time to Transfer', color: 'text-green-400', description: 'AUD is strong with low volatility — favourable conditions for sending money to India.' };
    } else if (volatilityLevel === 'CRITICAL' || (sentimentScore > 0.45 && momentumScore < 0.35)) {
        return { label: 'Wait if Possible', color: 'text-red-400', description: 'High volatility and negative sentiment — consider waiting for conditions to stabilise.' };
    } else if (volatilityLevel === 'MEDIUM' || volatilityLevel === 'HIGH') {
        return { label: 'Monitor Closely', color: 'text-yellow-400', description: 'Mixed signals — monitor daily and transfer if rate improves.' };
    }
    return { label: 'Neutral Conditions', color: 'text-gray-400', description: 'No strong signal either way — transfer based on your own timeline.' };
}

export default function AudInr({ apiUrl, onBack }: AudInrProps) {
    const [rateData, setRateData] = useState<any>(null);
    const [volatility, setVolatility] = useState<any>(null);
    const [sentimentHistory, setSentimentHistory] = useState<any[]>([]);
    const [accuracy, setAccuracy] = useState<any>(null);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [headlines, setHeadlines] = useState<any[]>([]);
    const [lagData, setLagData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [priceRange, setPriceRange] = useState<number>(30);
    const [activePage, setActivePage] = useState<number>(0);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [aiLoading, setAiLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rateRes, assetRes, predRes, sentRes, accRes, lagRes] = await Promise.all([
                    fetch(`${apiUrl}/exchange-rates/audinr`),
                    fetch(`${apiUrl}/asset/audinr?days=${priceRange}`),
                    fetch(`${apiUrl}/predictions/audinr`),
                    fetch(`${apiUrl}/sentiment/history/audinr`),
                    fetch(`${apiUrl}/predictions/accuracy/audinr`),
                    fetch(`${apiUrl}/lag-analysis`)
                ]);
                const rateJson = await rateRes.json();
                const assetJson = await assetRes.json();
                const predJson = await predRes.json();
                const sentJson = await sentRes.json();
                const accJson = await accRes.json();
                const lagJson = await lagRes.json();

                setRateData(rateJson);
                setVolatility(assetJson.volatility || null);
                setHeadlines(assetJson.headlines || []);
                setPredictions(predJson.predictions || []);
                setSentimentHistory(sentJson.history || []);
                setAccuracy(accJson);
                setLagData(lagJson.lag_analysis?.audinr || null);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch AUDINR data:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, [apiUrl, priceRange]);

    useEffect(() => {
        if (!volatility || !headlines.length) return;
        const generateAnalysis = async () => {
            setAiLoading(true);
            try {
                const recentHeadlines = headlines.slice(0, 5).map((h: any) => `"${h.headline}" (${h.sentiment})`).join(', ');
                const prompt = `You are a currency analyst helping an Australian family decide when to transfer AUD to INR. Given the following data, write a 2-3 sentence plain English analysis of the current AUD/INR outlook. Be specific, reference the actual numbers, and keep it accessible. Do not use bullet points.
Data:
- Current rate: 1 AUD = ${rateData?.current_rate?.toFixed(2)} INR
- Volatility level: ${volatility?.level} (score: ${(volatility?.score * 100).toFixed(1)}%)
- Sentiment score: ${(volatility?.sentiment_score * 100).toFixed(1)}% negative
- Price momentum: ${(volatility?.momentum_score * 100).toFixed(1)}%
- Recent headlines: ${recentHeadlines}
Write the analysis now:`;
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        max_tokens: 150,
                        temperature: 0.4,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const json = await response.json();
                const text = json.choices?.[0]?.message?.content?.trim();
                if (text) setAiAnalysis(text);
            } catch (err) {
                console.error('Groq analysis failed:', err);
            } finally {
                setAiLoading(false);
            }
        };
        generateAnalysis();
    }, [volatility, headlines, rateData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading AUD/INR intelligence...</p>
                </div>
            </div>
        );
    }

    // Chart data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const priceData = (rateData?.history || []).map((p: any) => ({
        date: p.date,
        audPrice: p.rate,
        predictedPrice: null
    }));

    const predictionData = predictions.map((p: any) => {
        const predDate = new Date(p.date + 'T00:00:00');
        const isPast = predDate < today;
        const actualPrice = p.actual_price ? parseFloat(p.actual_price.toFixed(4)) : null;
        return {
            date: p.date,
            audPrice: isPast && actualPrice ? actualPrice : null,
            predictedPrice: isPast ? null : parseFloat(p.predicted_price.toFixed(4))
        };
    });

    const chartData = [...priceData, ...predictionData].sort((a, b) =>
        new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime()
    );

    // Accuracy table pagination
    const allRows = accuracy?.accuracy || [];
    const thisWeekMonday = getWeekMonday(new Date());
    const thisWeekRows = allRows.filter((r: any) => {
        const d = new Date(r.date + 'T00:00:00');
        const rowMonday = getWeekMonday(d);
        return rowMonday.getTime() === thisWeekMonday.getTime();
    });
    const pastRows = allRows.filter((r: any) => {
        const d = new Date(r.date + 'T00:00:00');
        const rowMonday = getWeekMonday(d);
        return rowMonday.getTime() < thisWeekMonday.getTime();
    });
    const weeks: any[][] = [];
    pastRows.forEach((r: any) => {
        const rowMonday = getWeekMonday(new Date(r.date + 'T00:00:00'));
        const key = rowMonday.getTime();
        const existing = weeks.find(w => getWeekMonday(new Date(w[0].date + 'T00:00:00')).getTime() === key);
        if (existing) existing.push(r);
        else weeks.push([r]);
    });
    weeks.sort((a, b) => new Date(b[0].date + 'T00:00:00').getTime() - new Date(a[0].date + 'T00:00:00').getTime());
    const currentPageRows = activePage === -1 ? thisWeekRows : (weeks[activePage] || []);

    const transferRec = volatility ? getTransferRecommendation(volatility.level, volatility.sentiment_score, volatility.momentum_score) : null;

    const volColor = volatility ? (COLOR_MAP[volatility.color] || '#6b7280') : '#6b7280';

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-6xl mx-auto px-4 py-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Dashboard</span>
                    </button>
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white">AUD / INR</h1>
                    <p className="text-gray-400 mt-1">Australian Dollar to Indian Rupee — Currency Intelligence</p>
                </div>

                {/* 4 Stat Boxes */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Current Rate</p>
                        <p className="text-2xl font-bold text-white">
                            ₹{rateData?.current_rate?.toFixed(2) || '—'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">1 AUD = {rateData?.current_rate?.toFixed(2)} INR</p>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Volatility Score</p>
                        <p className="text-2xl font-bold" style={{ color: volColor }}>
                            {volatility ? `${(volatility.score * 100).toFixed(1)}%` : '—'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {volatility?.score < 0.35 ? 'Low market stress' :
                                volatility?.score < 0.50 ? 'Moderate stress' :
                                    volatility?.score < 0.65 ? 'Elevated stress' : 'Critical stress'}
                        </p>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Risk Level</p>
                        <p className="text-2xl font-bold" style={{ color: volColor }}>
                            {volatility?.level || '—'}
                        </p>
                        {transferRec && (
                            <p className={`text-xs mt-1 font-medium ${transferRec.color}`}>{transferRec.label}</p>
                        )}
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Sentiment Score</p>
                        <p className="text-2xl font-bold text-white">
                            {volatility ? `${(volatility.sentiment_score * 100).toFixed(1)}%` : '—'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {volatility?.sentiment_score < 0.25 ? 'Mostly positive news' :
                                volatility?.sentiment_score < 0.45 ? 'Mixed sentiment' : 'Predominantly negative'}
                        </p>
                    </div>
                </div>

                {/* Transfer Recommendation Banner */}
                {transferRec && (
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Transfer Recommendation</p>
                        <p className={`text-lg font-bold ${transferRec.color} mb-1`}>{transferRec.label}</p>
                        <p className="text-gray-300 text-sm">{transferRec.description}</p>
                    </div>
                )}

                {/* AI Analysis */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">AI Analysis</p>
                    {aiLoading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Generating analysis...</span>
                        </div>
                    ) : aiAnalysis ? (
                        <p className="text-gray-200 text-sm leading-relaxed">{aiAnalysis}</p>
                    ) : (
                        <p className="text-gray-500 text-sm">Analysis unavailable</p>
                    )}
                </div>

                {/* Lag Analysis */}
                {lagData && lagData.status === 'ok' && (
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Sentiment Lag Analysis</p>
                        <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                                <p className="text-gray-500 text-xs">Best Lag</p>
                                <p className="text-white font-semibold">
                                    {parseInt(lagData.best_lag.replace('lag_', '').replace('d', ''))} days
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Correlation</p>
                                <p className="text-white font-semibold">{lagData.best_correlation?.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Signal Type</p>
                                <p className="text-white font-semibold">
                                    {lagData.best_correlation >= 0 ? 'Contrarian' : 'Directional'}
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            {lagData.best_correlation >= 0
                                ? `Negative news sentiment tends to precede AUD/INR rate rises ${parseInt(lagData.best_lag.replace('lag_', '').replace('d', ''))} trading day(s) later — negative headlines today may signal a better rate ahead.`
                                : `Negative news sentiment tends to precede AUD/INR rate falls ${parseInt(lagData.best_lag.replace('lag_', '').replace('d', ''))} trading day(s) later — negative headlines today may signal a worse rate ahead.`
                            }
                        </p>
                    </div>
                )}

                {/* Price Chart */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Rate History + 5 Day Forecast</p>
                        <div className="flex gap-1">
                            {[{ label: '1M', value: 30 }, { label: '3M', value: 90 }, { label: '6M', value: 180 }, { label: '1Y', value: 365 }].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPriceRange(opt.value)}
                                    className={`px-2 py-1 text-xs rounded ${priceRange === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                tickFormatter={(val) => new Date(val + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}
                                interval={Math.floor(chartData.length / 6)}
                            />
                            <YAxis
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `₹${val.toFixed(1)}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="audPrice" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} />
                            <Line type="monotone" dataKey="predictedPrice" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-blue-500"></div><span className="text-gray-400 text-xs">Actual Rate</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-purple-500" style={{ borderTop: '2px dashed #a855f7', background: 'none' }}></div><span className="text-gray-400 text-xs">Forecast</span></div>
                    </div>
                </div>

                {/* Sentiment Trend */}
                {sentimentHistory.length > 0 && (
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-4">Sentiment Trend</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={sentimentHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    tickFormatter={(val) => new Date(val + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}
                                    interval={Math.floor(sentimentHistory.length / 5)}
                                />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                                <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                                <Area type="monotone" dataKey="negative_pct" stackId="1" stroke="#ef4444" fill="#ef444420" name="Negative" />
                                <Area type="monotone" dataKey="neutral_pct" stackId="1" stroke="#6b7280" fill="#6b728020" name="Neutral" />
                                <Area type="monotone" dataKey="positive_pct" stackId="1" stroke="#22c55e" fill="#22c55e20" name="Positive" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Prediction Accuracy Table */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Prediction Accuracy</p>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        <button
                            onClick={() => setActivePage(-1)}
                            className={`px-3 py-1 text-xs rounded ${activePage === -1 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            This Week
                        </button>
                        {weeks.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActivePage(i)}
                                className={`px-3 py-1 text-xs rounded ${activePage === i ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Page {i + 1}
                            </button>
                        ))}
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-400 text-xs border-b border-gray-800">
                                <th className="text-left py-2">Date</th>
                                <th className="text-right py-2">Predicted</th>
                                <th className="text-right py-2">Actual</th>
                                <th className="text-right py-2">Error</th>
                                <th className="text-right py-2">R²</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentPageRows.map((row: any, i: number) => {
                                const error = row.actual_price && row.predicted_price
                                    ? Math.abs((row.predicted_price - row.actual_price) / row.actual_price * 100)
                                    : null;
                                const isFuture = new Date(row.date + 'T00:00:00') >= today;
                                return (
                                    <tr key={i} className="border-b border-gray-800/50">
                                        <td className="py-2 text-gray-300">
                                            {new Date(row.date + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td className="py-2 text-right text-gray-300">
                                            ₹{row.predicted_price?.toFixed(2) || '—'}
                                        </td>
                                        <td className="py-2 text-right text-gray-300">
                                            {row.actual_price ? `₹${row.actual_price.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="py-2 text-right">
                                            {error !== null ? (
                                                <span className={error < 1 ? 'text-green-400' : error < 2 ? 'text-yellow-400' : 'text-red-400'}>
                                                    {error.toFixed(2)}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="py-2 text-right text-gray-400 text-xs">
                                            {!isFuture && row.model_r2 ? row.model_r2.toFixed(3) : ''}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Headlines */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Latest Headlines</p>
                    <div className="space-y-3">
                        {headlines.slice(0, 15).map((h: any, i: number) => (
                            <div key={i} className="border-b border-gray-800/50 pb-3 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-gray-200 text-sm flex-1">{h.headline}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${SENTIMENT_COLORS[h.sentiment] || SENTIMENT_COLORS.neutral}`}>
                                        {h.sentiment}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-gray-500 text-xs uppercase">{h.source}</span>
                                    {h.published_at && (
                                        <span className="text-gray-600 text-xs">
                                            {new Date(h.published_at).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                    )}
                                    <span className="text-gray-600 text-xs">relevance: {h.combined_relevance?.toFixed(2) || '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
