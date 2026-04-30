import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { Asset } from '../App';

interface DashboardProps {
    assets: Asset[];
    lastUpdated: string;
    onSelectAsset: (asset: string) => void;
    onRefresh: () => void;
    audRate: number | null;
    lastPipelineRun: any;
}

const ASSET_LABELS: Record<string, string> = {
    gold: 'Gold',
    silver: 'Silver',
    oil: 'Crude Oil',
    asx200: 'ASX 200'
};

const ASSET_SYMBOLS: Record<string, string> = {
    gold: 'XAU/USD',
    silver: 'XAG/USD',
    oil: 'WTI',
    asx200: 'ASX:XJO'
};

const ASSET_DOMAINS: Record<string, string> = {
    gold: 'Precious Metals',
    silver: 'Precious Metals',
    oil: 'Energy',
    asx200: 'Equity Markets'
};

const COLOR_CLASSES: Record<string, string> = {
    green: 'border-green-500 bg-green-500',
    yellow: 'border-yellow-500 bg-yellow-500',
    orange: 'border-orange-500 bg-orange-500',
    red: 'border-red-500 bg-red-500'
};

const LEVEL_TEXT: Record<string, string> = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    red: 'text-red-400'
};

const DOMAINS = ['Precious Metals', 'Energy', 'Equity Markets'];

export default function Dashboard({ assets, lastUpdated, onSelectAsset, onRefresh, audRate, lastPipelineRun }: DashboardProps) {
    const [clockDisplay, setClockDisplay] = useState<string>('');
    const [clockDay, setClockDay] = useState<string>('');
    const [publicHoliday, setPublicHoliday] = useState<string | null>(null);

    // Live clock — ticks every second
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const display = now.toLocaleDateString('en-AU', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ', ' + now.toLocaleTimeString('en-AU', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            const day = now.toLocaleDateString('en-AU', { weekday: 'long' });
            setClockDisplay(display);
            setClockDay(day);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Public holiday fetch — once on mount
    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AU`)
            .then(res => res.json())
            .then((holidays: any[]) => {
                const todayStr = today.toISOString().split('T')[0];
                const match = holidays.find(h => h.date === todayStr);
                setPublicHoliday(match ? match.localName : null);
            })
            .catch(() => setPublicHoliday(null));
    }, []);
    
    const getAssetsByDomain = (domain: string) =>
        assets.filter(a => ASSET_DOMAINS[a.asset] === domain);

    const getMomentumIcon = (score: number) => {
        if (score > 0.55) return <TrendingDown className="w-4 h-4 text-red-400" />;
        if (score < 0.45) return <TrendingUp className="w-4 h-4 text-green-400" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getVolatilityInterpretation = (sentiment: number, momentum: number, trend: number): string => {
        const sentimentLabel =
            sentiment < 0.25 ? "low negativity" :
            sentiment < 0.45 ? "moderate negative sentiment" :
            "elevated negative sentiment";

        const momentumLabel =
            momentum < 0.35 ? "downward price momentum" :
            momentum < 0.55 ? "neutral price momentum" :
            "upward price momentum";

        const trendLabel =
            trend < 0.35 ? "sentiment stabilising" :
            trend < 0.55 ? "flat sentiment trend" :
            "rising negative sentiment trend";

        return `${sentimentLabel} · ${momentumLabel} · ${trendLabel}`;
    };

    const overallRisk = assets.length > 0
        ? assets.reduce((sum, a) => sum + a.volatility_score, 0) / assets.length
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                {/* Left — title */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Market Intelligence</h1>
                    <p className="text-gray-400 mt-1">Multi-agent sentiment and volatility analysis</p>
                </div>

                {/* Centre — live clock */}
                <div className="text-center">
                    <p className="text-lg font-mono font-semibold text-white">{clockDisplay}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {clockDay}{publicHoliday ? `, ${publicHoliday}` : ''}
                    </p>
                </div>

                {/* Right — refresh controls */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Dashboard refreshed</p>
                        <p className="text-xs text-gray-400">{lastUpdated}</p>
                        {lastPipelineRun?.minutes_ago !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Pipeline: {lastPipelineRun?.minutes_ago < 60
                                    ? `${lastPipelineRun?.minutes_ago}m ago`
                                    : `${Math.floor(lastPipelineRun?.minutes_ago / 60)}h ago`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Overall Risk Banner */}
            <div className="bg-gray-900 rounded-xl p-5 mb-8 border border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <span className="text-gray-300 font-medium">Overall Market Risk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-48 bg-gray-800 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                style={{ width: `${overallRisk * 100}%` }}
                            />
                        </div>
                        <span className="text-white font-bold">{(overallRisk * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Domains */}
            {DOMAINS.map(domain => {
                const domainAssets = getAssetsByDomain(domain);
                if (domainAssets.length === 0) return null;
                return (
                    <div key={domain} className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-300 mb-4 uppercase tracking-wider text-sm">
                            {domain}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {domainAssets.map(asset => (
                                <div
                                    key={asset.asset}
                                    onClick={() => onSelectAsset(asset.asset)}
                                    className={`bg-gray-900 rounded-xl p-5 border-l-4 ${COLOR_CLASSES[asset.color]?.split(' ')[0]} cursor-pointer hover:bg-gray-800 transition-all`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{ASSET_LABELS[asset.asset]}</h3>
                                            <p className="text-xs text-gray-500">{ASSET_SYMBOLS[asset.asset]}</p>
                                        </div>
                                        <div className="text-right">
                                            {asset.asset === 'asx200' ? (
                                                <p className="text-xl font-bold text-white">
                                                    {asset.latest_price?.toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts
                                                </p>
                                            ) : (
                                                <div className="text-right">
                                                    <p className="text-base font-bold text-white">
                                                        AU${audRate ? (asset.latest_price * audRate).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        US${asset.latest_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                {getMomentumIcon(asset.momentum_score)}
                                                <span className="text-xs text-gray-400">momentum</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Volatility Risk</p>
                                            <div className="w-32 bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${COLOR_CLASSES[asset.color]?.split(' ')[1]}`}
                                                    style={{ width: `${asset.volatility_score * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${LEVEL_TEXT[asset.color]}`}>
                                            {asset.volatility_level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5 italic">
                                        {getVolatilityInterpretation(asset.sentiment_score, asset.momentum_score, asset.trend_score)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-2">
                                        Updated: {new Date(asset.analysed_at).toLocaleString('en-AU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}