import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { SavedOutfit, ClothingItem, ScheduledOutfitWithDetails } from '../types';
import * as scheduleService from '../src/services/scheduleService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface WeeklyPlannerViewProps {
  savedOutfits: SavedOutfit[];
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (outfit: SavedOutfit) => void;
}

interface DayCell {
  date: string; // ISO date (YYYY-MM-DD)
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  scheduledOutfit: ScheduledOutfitWithDetails | null;
}

const WeeklyPlannerView = ({ savedOutfits, closet, onClose, onViewOutfit }: WeeklyPlannerViewProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [schedule, setSchedule] = useState<ScheduledOutfitWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get start of week (Monday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }

  // Generate week cells
  const weekCells: DayCell[] = useMemo(() => {
    const cells: DayCell[] = [];
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const scheduledOutfit = schedule.find(s => s.date === dateStr) || null;

      cells.push({
        date: dateStr,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        isToday: dateStr === today,
        scheduledOutfit,
      });
    }

    return cells;
  }, [currentWeekStart, schedule]);

  // Load schedule for current week
  useEffect(() => {
    loadWeekSchedule();
  }, [currentWeekStart]);

  const loadWeekSchedule = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDateStr = currentWeekStart.toISOString().split('T')[0];
      const weekSchedule = await scheduleService.getWeekSchedule(startDateStr);
      setSchedule(weekSchedule);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setError('Error al cargar el calendario. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    // Dropped outside valid droppable
    if (!destination) return;

    // Same location
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Get outfit ID being dragged
    const outfitId = result.draggableId.replace('outfit-', '');

    // Get target date
    const targetDate = destination.droppableId.replace('day-', '');

    setIsSaving(true);
    setError(null);

    try {
      // Schedule outfit for this date
      await scheduleService.scheduleOutfit(targetDate, outfitId);

      // Reload schedule
      await loadWeekSchedule();
    } catch (err) {
      console.error('Error scheduling outfit:', err);
      setError('Error al programar el outfit. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove outfit from day
  const handleRemoveOutfit = async (date: string) => {
    setIsSaving(true);
    setError(null);

    try {
      await scheduleService.deleteScheduleByDate(date);
      await loadWeekSchedule();
    } catch (err) {
      console.error('Error removing outfit:', err);
      setError('Error al eliminar el outfit. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // Get outfit preview
  const getOutfitPreview = (outfit: SavedOutfit) => {
    const top = closet.find(item => item.id === outfit.top_id);
    const bottom = closet.find(item => item.id === outfit.bottom_id);
    const shoes = closet.find(item => item.id === outfit.shoes_id);

    return { top, bottom, shoes };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
              Planificador Semanal
            </h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Arrastrá outfits a los días de la semana
            </p>
          </div>
          <Card
            variant="glass"
            padding="none"
            rounded="full"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </Card>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Card
              variant="glass"
              padding="sm"
              rounded="xl"
              onClick={goToPreviousWeek}
              component="button"
              className="transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_left</span>
              Anterior
            </Card>

            <div className="text-center">
              <p className="text-lg font-bold text-text-primary dark:text-gray-200">
                {currentWeekStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </p>
              <button
                onClick={goToThisWeek}
                className="text-sm text-primary hover:underline"
              >
                Ir a esta semana
              </button>
            </div>

            <Card
              variant="glass"
              padding="sm"
              rounded="xl"
              onClick={goToNextWeek}
              component="button"
              className="transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              Siguiente
              <span className="material-symbols-outlined">chevron_right</span>
            </Card>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader />
              <p className="text-text-secondary dark:text-gray-400 mt-4">
                Cargando calendario...
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Saved Outfits Sidebar */}
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-3">
                    Outfits Guardados
                  </h3>
                  <Droppable droppableId="saved-outfits" isDropDisabled={true}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2"
                      >
                        {savedOutfits.length === 0 ? (
                          <p className="text-sm text-text-secondary dark:text-gray-400 text-center py-8">
                            No tenés outfits guardados
                          </p>
                        ) : (
                          savedOutfits.map((outfit, index) => {
                            const preview = getOutfitPreview(outfit);
                            return (
                              <Draggable
                                key={outfit.id}
                                draggableId={`outfit-${outfit.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <Card
                                    variant="glass"
                                    padding="sm"
                                    rounded="xl"
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-grab active:cursor-grabbing transition-all ${
                                      snapshot.isDragging ? 'shadow-xl scale-105' : ''
                                    } ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <div className="flex gap-2 mb-2">
                                      {preview.top && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                          <img src={preview.top.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      {preview.bottom && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                          <img src={preview.bottom.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      {preview.shoes && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                          <img src={preview.shoes.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2">
                                      {outfit.explanation}
                                    </p>
                                  </Card>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Week Grid */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {weekCells.map((day) => (
                      <Droppable key={day.date} droppableId={`day-${day.date}`}>
                        {(provided, snapshot) => (
                          <Card
                            variant={snapshot.isDraggingOver ? "default" : "glass"}
                            padding="sm"
                            rounded="2xl"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[200px] transition-all ${
                              snapshot.isDraggingOver
                                ? 'bg-primary/10 border-2 border-primary'
                                : ''
                            } ${day.isToday ? 'ring-2 ring-primary' : ''} ${
                              isSaving ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            {/* Day Header */}
                            <div className="text-center mb-3">
                              <p className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                                {day.dayName}
                              </p>
                              <p className={`text-2xl font-bold ${
                                day.isToday ? 'text-primary' : 'text-text-primary dark:text-gray-200'
                              }`}>
                                {day.dayNumber}
                              </p>
                            </div>

                            {/* Scheduled Outfit */}
                            {day.scheduledOutfit ? (
                              <div className="space-y-2">
                                {(() => {
                                  const preview = getOutfitPreview(day.scheduledOutfit.outfit);
                                  return (
                                    <>
                                      <div className="grid grid-cols-3 gap-1">
                                        {preview.top && (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img src={preview.top.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                        {preview.bottom && (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img src={preview.bottom.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                        {preview.shoes && (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img src={preview.shoes.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => onViewOutfit(day.scheduledOutfit!.outfit)}
                                          className="flex-1 px-2 py-1 bg-primary text-white rounded-lg text-xs transition-transform active:scale-95"
                                        >
                                          Ver
                                        </button>
                                        <button
                                          onClick={() => handleRemoveOutfit(day.date)}
                                          className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs transition-transform active:scale-95"
                                        >
                                          <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="text-center text-xs text-text-secondary dark:text-gray-400 py-8">
                                Arrastrá un outfit aquí
                              </div>
                            )}

                            {provided.placeholder}
                          </Card>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>

              </div>
            </DragDropContext>
          )}

        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
