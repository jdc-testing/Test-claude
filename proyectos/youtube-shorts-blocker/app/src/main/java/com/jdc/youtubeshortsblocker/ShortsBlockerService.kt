package com.jdc.youtubeshortsblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ShortsBlockerService : AccessibilityService() {

    companion object {
        var isRunning = false
        private val SHORTS_ACTIVITY_PATTERNS = listOf(
            "shorts",
            "reel",
            "shortspivot",
            "reelwatch"
        )
        private val YOUTUBE_PACKAGE = "com.google.android.youtube"
    }

    override fun onServiceConnected() {
        isRunning = true
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            packageNames = arrayOf(YOUTUBE_PACKAGE)
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100L
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return

        // Detección primaria: nombre de actividad/clase contiene "Shorts" o "Reel"
        val className = event.className?.toString()?.lowercase() ?: ""
        if (SHORTS_ACTIVITY_PATTERNS.any { className.contains(it) }) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        // Detección secundaria: tab "Shorts" seleccionado en la navegación inferior
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            val rootNode = rootInActiveWindow ?: return
            try {
                if (isShortsTabActive(rootNode)) {
                    performGlobalAction(GLOBAL_ACTION_BACK)
                }
            } finally {
                rootNode.recycle()
            }
        }
    }

    /**
     * Busca en el árbol de accesibilidad si el tab "Shorts" está seleccionado
     * en la barra de navegación inferior de YouTube.
     */
    private fun isShortsTabActive(root: AccessibilityNodeInfo): Boolean {
        val nodes = root.findAccessibilityNodeInfosByText("Shorts")
        if (nodes.isNullOrEmpty()) return false

        for (node in nodes) {
            try {
                // El tab activo está seleccionado o es el elemento enfocado en la nav bar
                if (node.isSelected) return true

                // También verificar el padre: si el item de nav está seleccionado
                val parent = node.parent
                if (parent != null) {
                    try {
                        if (parent.isSelected) {
                            return true
                        }
                    } finally {
                        parent.recycle()
                    }
                }
            } finally {
                node.recycle()
            }
        }
        return false
    }

    override fun onInterrupt() {
        // No se requiere acción
    }

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }
}
