package com.jdc.youtubeshortsblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Detecta los feeds de vídeo vertical (YouTube Shorts e Instagram Reels) y
 * navega hacia atrás automáticamente. El resto de la app no se ve afectada.
 */
class ShortsBlockerService : AccessibilityService() {

    companion object {
        var isRunning = false

        /** Espera tras un click para que la pantalla de destino haya cargado. */
        private const val CLICK_CHECK_DELAY_MS = 300L

        /** Evita encadenar varios "atrás" seguidos y salirse de la app. */
        private const val BACK_COOLDOWN_MS = 600L

        /** Niveles de ancestros que se revisan buscando el estado seleccionado. */
        private const val MAX_ANCESTOR_DEPTH = 3
    }

    private val handler = Handler(Looper.getMainLooper())
    private var pendingCheck: Runnable? = null
    private var lastBackAt = 0L

    override fun onServiceConnected() {
        isRunning = true
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED
            packageNames = BlockTarget.packageNames
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 50L
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val target = BlockTarget.forPackage(event.packageName?.toString()) ?: return
        if (!BlockerPrefs.isEnabled(this, target)) return

        // Detección 1: el nombre de clase del evento identifica el visor vertical
        val className = event.className?.toString()?.lowercase() ?: ""
        if (target.classPatterns.any { className.contains(it) }) {
            goBack()
            return
        }

        // Detección 2: click sobre algo etiquetado explícitamente como Shorts/Reels
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val label = buildString {
                append(event.text.joinToString(" "))
                append(' ')
                append(event.contentDescription ?: "")
            }.lowercase()
            if (target.clickKeywords.any { label.contains(it) }) {
                goBack()
                return
            }
            // Cualquier otro click puede abrir el feed vertical desde el muro:
            // programar un chequeo retrasado para cuando la transición termine
            scheduleDelayedCheck()
        }

        // Detección 3: chequeo inmediato del árbol de UI
        checkVerticalFeedUI()
    }

    /**
     * Programa un chequeo [CLICK_CHECK_DELAY_MS] después de un click,
     * para cuando la pantalla de Shorts/Reels ya haya cargado.
     */
    private fun scheduleDelayedCheck() {
        pendingCheck?.let { handler.removeCallbacks(it) }
        pendingCheck = Runnable { checkVerticalFeedUI() }
        handler.postDelayed(pendingCheck!!, CLICK_CHECK_DELAY_MS)
    }

    private fun checkVerticalFeedUI() {
        val root = rootInActiveWindow ?: return
        try {
            val target = BlockTarget.forPackage(root.packageName?.toString()) ?: return
            if (!BlockerPrefs.isEnabled(this, target)) return
            if (isViewerOpen(root, target) || isTabSelected(root, target)) {
                goBack()
            }
        } finally {
            root.recycle()
        }
    }

    /** Busca ids de vista que solo existen en el visor a pantalla completa. */
    private fun isViewerOpen(root: AccessibilityNodeInfo, target: BlockTarget): Boolean {
        for (id in target.viewerIds) {
            val nodes = root.findAccessibilityNodeInfosByViewId("${target.packageName}:id/$id")
            if (nodes.isNullOrEmpty()) continue
            nodes.forEach { it.recycle() }
            return true
        }
        return false
    }

    /**
     * Busca la pestaña Shorts/Reels y comprueba que esté activa. Sin esa
     * comprobación se bloquearía también el muro normal, donde la pestaña
     * está siempre presente pero sin seleccionar.
     */
    private fun isTabSelected(root: AccessibilityNodeInfo, target: BlockTarget): Boolean {
        for (label in target.tabLabels) {
            val nodes = root.findAccessibilityNodeInfosByText(label) ?: continue
            for (node in nodes) {
                try {
                    if (isNodeOrAncestorActive(node)) return true
                } finally {
                    node.recycle()
                }
            }
        }
        return false
    }

    private fun isNodeOrAncestorActive(node: AccessibilityNodeInfo): Boolean {
        if (node.isSelected || node.isChecked || node.isFocused) return true

        var parent: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (parent != null && depth < MAX_ANCESTOR_DEPTH) {
            val active = parent.isSelected || parent.isChecked || parent.isFocused
            val next = parent.parent
            parent.recycle()
            parent = next
            depth++
            if (active) {
                parent?.recycle()
                return true
            }
        }
        parent?.recycle()
        return false
    }

    private fun goBack() {
        val now = SystemClock.uptimeMillis()
        if (now - lastBackAt < BACK_COOLDOWN_MS) return
        lastBackAt = now
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        isRunning = false
        pendingCheck?.let { handler.removeCallbacks(it) }
        super.onDestroy()
    }
}
